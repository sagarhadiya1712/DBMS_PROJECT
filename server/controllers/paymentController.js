const db = require('../db/db');
const { createRazorpayOrder, verifyRazorpaySignature, getRazorpayKeyId } = require('../utils/razorpay');
const { generateInvoicePDF } = require('../utils/pdfInvoice');

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
      currency: order.currency,
      key_id: order.key_id,
      booking_id: booking.booking_id
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/verify
async function verifyPayment(req, res, next) {
  try {
    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = verifyRazorpaySignature({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Payment signature verification failed. Tampered payload detected.' });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE payments
        SET payment_status = 'Paid',
            razorpay_payment_id = ?,
            razorpay_order_id = ?,
            paid_at = datetime('now')
        WHERE booking_id = ?
      `).run(razorpay_payment_id, razorpay_order_id, booking_id);

      // Transition booking from Pending to Approved upon successful payment capture
      db.prepare(`
        UPDATE bookings
        SET status = 'Approved'
        WHERE booking_id = ? AND status = 'Pending'
      `).run(booking_id);

      // Mark vehicle as reserved/rented
      const b = db.prepare('SELECT vehicle_id FROM bookings WHERE booking_id = ?').get(booking_id);
      if (b) {
        db.prepare("UPDATE vehicles SET status = 'Rented' WHERE vehicle_id = ?").run(b.vehicle_id);
      }
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
        p.payment_status,
        p.razorpay_payment_id,
        p.paid_at
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

module.exports = {
  createOrder,
  verifyPayment,
  getInvoice
};
