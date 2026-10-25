const db = require('../db/db');
const { createRazorpayOrder, verifyRazorpaySignature, getRazorpayKeyId } = require('../utils/razorpay');
const { generateInvoicePDF } = require('../utils/pdfInvoice');
const crypto = require('crypto');

// POST /api/payments/create-order
async function createOrder(req, res, next) {
  try {
    const { booking_id } = req.body;
    const userId = req.user.user_id;

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(booking_id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (req.user.role !== 'admin' && booking.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this booking.' });
    }

    // Check if slot hold has expired
    if (booking.status === 'Awaiting Payment' && booking.hold_expires_at) {
      if (new Date(booking.hold_expires_at).getTime() < Date.now()) {
        db.transaction(() => {
          db.prepare("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?").run(booking.booking_id);
          db.prepare("UPDATE payments SET payment_status = 'Failed' WHERE booking_id = ?").run(booking.booking_id);
          db.prepare("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = ?").run(booking.vehicle_id);
        })();
        return res.status(410).json({
          error: 'Payment hold expired for this slot (10 minutes exceeded). Please create a new booking.',
          expired: true
        });
      }
    }

    // Amount to charge = total_amount + deposit_amount
    const payableAmount = booking.total_amount + (booking.deposit_amount || 0);

    const order = await createRazorpayOrder({
      amount: payableAmount,
      receipt: `b_${booking.booking_id}`,
      notes: { booking_id: booking.booking_id, user_id: userId }
    });

    // Update payment record with order ID
    db.prepare(`
      UPDATE payments
      SET razorpay_order_id = ?, amount = ?
      WHERE booking_id = ?
    `).run(order.id, payableAmount, booking.booking_id);

    res.json({
      order_id: order.id,
      amount: payableAmount,
      currency: order.currency || 'INR',
      key_id: order.key_id,
      booking_id: booking.booking_id,
      hold_expires_at: booking.hold_expires_at
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/verify
async function verifyPayment(req, res, next) {
  try {
    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(booking_id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const currentPayment = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(booking_id);

    // Idempotency check: Already confirmed & paid
    if (booking.status === 'Confirmed' && currentPayment?.payment_status === 'Paid') {
      return res.json({
        success: true,
        message: 'Payment already verified and booking confirmed.',
        booking_id
      });
    }

    // Check if slot hold has expired
    if (booking.status === 'Awaiting Payment' && booking.hold_expires_at) {
      const holdTime = new Date(booking.hold_expires_at).getTime();
      if (Date.now() > holdTime) {
        db.transaction(() => {
          db.prepare("UPDATE payments SET payment_status = 'Failed' WHERE booking_id = ?").run(booking_id);
          db.prepare("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?").run(booking_id);
          db.prepare("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = ?").run(booking.vehicle_id);
        })();

        return res.status(410).json({
          error: 'Payment hold expired for this slot (10 minutes exceeded). If your money was debited, it will be refunded automatically within 5-7 business days. Please create a new booking.',
          expired: true,
          refund_needed: true
        });
      }
    }

    // Verify cryptographic signature
    const isValid = verifyRazorpaySignature({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValid) {
      db.transaction(() => {
        db.prepare("UPDATE payments SET payment_status = 'Failed' WHERE booking_id = ?").run(booking_id);
        db.prepare("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?").run(booking_id);
        db.prepare("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = ?").run(booking.vehicle_id);
      })();
      return res.status(400).json({ error: 'Payment signature verification failed. Tampered payload detected.' });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE payments
        SET payment_status = 'Paid',
            razorpay_payment_id = ?,
            razorpay_order_id = ?,
            method = 'Card',
            paid_at = datetime('now')
        WHERE booking_id = ?
      `).run(razorpay_payment_id, razorpay_order_id, booking_id);

      // Transition booking from Awaiting Payment / Pending to Confirmed upon successful payment capture
      db.prepare(`
        UPDATE bookings
        SET status = 'Confirmed',
            hold_expires_at = NULL
        WHERE booking_id = ?
      `).run(booking_id);

      // Mark vehicle as reserved/rented
      db.prepare("UPDATE vehicles SET status = 'Rented' WHERE vehicle_id = ?").run(booking.vehicle_id);
    })();

    res.json({
      success: true,
      message: 'Payment verified and booking confirmed successfully!',
      booking_id
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/:bookingId/retry
async function retryPayment(req, res, next) {
  try {
    const { bookingId } = req.params;
    const userId = req.user.user_id;

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (req.user.role !== 'admin' && booking.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this booking.' });
    }

    if (booking.status !== 'Awaiting Payment') {
      return res.status(400).json({
        error: `Cannot retry payment. Booking is already in '${booking.status}' status.`
      });
    }

    // Check hold expiration
    if (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() < Date.now()) {
      db.transaction(() => {
        db.prepare("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?").run(bookingId);
        db.prepare("UPDATE payments SET payment_status = 'Failed' WHERE booking_id = ?").run(bookingId);
        db.prepare("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = ?").run(booking.vehicle_id);
      })();

      return res.status(410).json({
        error: 'Payment hold expired for this slot (10 minutes exceeded). Please create a new booking.',
        expired: true
      });
    }

    const payableAmount = booking.total_amount + (booking.deposit_amount || 0);

    const order = await createRazorpayOrder({
      amount: payableAmount,
      receipt: `retry_${booking.booking_id}_${Date.now()}`,
      notes: { booking_id: booking.booking_id, user_id: userId }
    });

    db.prepare(`
      UPDATE payments
      SET razorpay_order_id = ?, amount = ?
      WHERE booking_id = ?
    `).run(order.id, payableAmount, booking.booking_id);

    res.json({
      order_id: order.id,
      amount: payableAmount,
      currency: order.currency || 'INR',
      key_id: order.key_id,
      booking_id: booking.booking_id,
      hold_expires_at: booking.hold_expires_at
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/webhook (Razorpay Webhook Backup)
async function handleWebhook(req, res) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature if secret configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature.' });
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id;
      const paymentId = payload?.payment?.entity?.id;

      if (orderId) {
        const payment = db.prepare('SELECT * FROM payments WHERE razorpay_order_id = ?').get(orderId);
        if (payment && payment.payment_status !== 'Paid') {
          db.transaction(() => {
            db.prepare(`
              UPDATE payments
              SET payment_status = 'Paid',
                  razorpay_payment_id = COALESCE(?, razorpay_payment_id),
                  paid_at = datetime('now')
              WHERE payment_id = ?
            `).run(paymentId || null, payment.payment_id);

            db.prepare(`
              UPDATE bookings
              SET status = 'Confirmed',
                  hold_expires_at = NULL
              WHERE booking_id = ? AND status = 'Awaiting Payment'
            `).run(payment.booking_id);

            const b = db.prepare('SELECT vehicle_id FROM bookings WHERE booking_id = ?').get(payment.booking_id);
            if (b) {
              db.prepare("UPDATE vehicles SET status = 'Rented' WHERE vehicle_id = ?").run(b.vehicle_id);
            }
          })();
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(200).json({ status: 'error_handled' });
  }
}

// PATCH /api/admin/payments/:paymentId/collect-cash (Admin Only)
async function collectCashPayment(req, res, next) {
  try {
    const { paymentId } = req.params;
    const adminId = req.user.user_id;

    const payment = db.prepare(`
      SELECT p.*, b.status as booking_status, b.vehicle_id, b.user_id, u.name as customer_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      WHERE p.payment_id = ?
    `).get(paymentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    if (payment.method !== 'COD') {
      return res.status(400).json({
        error: `Cannot collect cash on non-COD payment. Method is '${payment.method}'.`
      });
    }

    if (payment.payment_status === 'Paid') {
      return res.status(400).json({
        error: 'This payment has already been marked as Paid.'
      });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE payments
        SET payment_status = 'Paid',
            paid_at = datetime('now'),
            collected_by = ?
        WHERE payment_id = ?
      `).run(adminId, paymentId);
    })();

    res.json({
      success: true,
      message: `Cash payment of Rs. ${payment.amount} successfully marked as Paid.`,
      payment_id: Number(paymentId),
      payment_status: 'Paid',
      paid_at: new Date().toISOString(),
      collected_by: adminId
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/invoice/:bookingId (Stream PDF)
function getInvoice(req, res, next) {
  try {
    const { bookingId } = req.params;

    const booking = db.prepare(`
      SELECT b.*,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        v.name AS vehicle_name,
        v.brand AS vehicle_brand,
        v.category AS vehicle_category,
        v.fuel_type,
        v.transmission,
        v.is_chauffeur_driven,
        p.payment_id,
        p.method AS payment_method_name,
        p.payment_status,
        p.amount AS payment_amount,
        p.razorpay_payment_id,
        p.paid_at,
        p.collected_by
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id
      WHERE b.booking_id = ?
    `).get(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Invoice not found for this booking.' });
    }

    // Set PDF response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Invoice-Booking-${booking.booking_id}.pdf`
    );

    generateInvoicePDF(booking, res);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/payments/:id (Admin soft delete)
function deletePayment(req, res, next) {
  try {
    const { id } = req.params;
    const payment = db.prepare('SELECT payment_id FROM payments WHERE payment_id = ?').get(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }
    db.prepare("UPDATE payments SET deleted_at = datetime('now') WHERE payment_id = ?").run(id);
    res.json({ message: 'Payment record soft deleted successfully.', payment_id: id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  retryPayment,
  handleWebhook,
  collectCashPayment,
  getInvoice,
  deletePayment
};
