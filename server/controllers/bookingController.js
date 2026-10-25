const { z } = require('zod');
const db = require('../db/db');

const createBookingSchema = z.object({
  vehicle_id: z.coerce.number().int().positive(),
  start_datetime: z.string().datetime(),
  end_datetime: z.string().datetime(),
  pricing_type: z.enum(['day', 'hour', 'km']).default('day'),
  discount_code: z.string().optional().nullable(),
  estimated_km: z.coerce.number().optional()
});

// POST /api/bookings
async function createBooking(req, res, next) {
  try {
    const data = createBookingSchema.parse(req.body);
    const userId = req.user.user_id;

    const start = new Date(data.start_datetime);
    const end = new Date(data.end_datetime);

    if (end <= start) {
      return res.status(400).json({ error: 'End date/time must be strictly after start date/time.' });
    }

    // Begin DB transaction to ensure atomic double-booking check & booking creation
    const transaction = db.transaction(() => {
      // 1. Fetch vehicle
      const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(data.vehicle_id);
      if (!vehicle) {
        throw new Error('Vehicle not found.');
      }

      if (vehicle.status === 'In Service') {
        throw new Error('This vehicle is currently undergoing maintenance and is not available for rental.');
      }

      // 2. Strict Overlap Check (Zero Double-Booking Guard)
      // Conflicting if existing booking starts before new one ends AND ends after new one starts
      const overlapQuery = `
        SELECT booking_id, start_datetime, end_datetime, status
        FROM bookings
        WHERE vehicle_id = ?
          AND status IN ('Pending', 'Approved', 'Active')
          AND NOT (end_datetime <= ? OR start_datetime >= ?)
      `;
      const conflict = db.prepare(overlapQuery).get(
        data.vehicle_id,
        data.start_datetime,
        data.end_datetime
      );

      if (conflict) {
        const err = new Error(
          `Schedule conflict: Vehicle is already reserved from ${conflict.start_datetime} to ${conflict.end_datetime}. Please select different dates.`
        );
        err.statusCode = 409;
        throw err;
      }

      // 3. Auto-calculate pricing
      const diffMs = end.getTime() - start.getTime();
      let baseAmount = 0;

      if (data.pricing_type === 'hour') {
        const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
        baseAmount = hours * vehicle.price_per_hour;
      } else if (data.pricing_type === 'km') {
        const km = Number(data.estimated_km) || 100;
        baseAmount = km * vehicle.price_per_km;
      } else {
        // 'day'
        const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        baseAmount = days * vehicle.price_per_day;
      }

      // 4. Validate Discount Code
      let discountAmount = 0;
      if (data.discount_code) {
        const cleanCode = data.discount_code.trim().toUpperCase();
        const discount = db.prepare(`
          SELECT * FROM discounts
          WHERE code = ? AND active = 1
            AND (valid_from IS NULL OR valid_from <= date('now'))
            AND (valid_to IS NULL OR valid_to >= date('now'))
        `).get(cleanCode);

        if (discount) {
          discountAmount = Math.round((baseAmount * discount.percent) / 100);
        }
      }

      const totalAmount = Math.max(0, baseAmount - discountAmount);
      const depositAmount = vehicle.security_deposit || 0;

      // 5. Insert Booking
      const insertBooking = db.prepare(`
        INSERT INTO bookings (
          user_id, vehicle_id, start_datetime, end_datetime,
          pricing_type, total_amount, deposit_amount, discount_amount, late_fee, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Pending')
      `);

      const bookingResult = insertBooking.run(
        userId,
        vehicle.vehicle_id,
        data.start_datetime,
        data.end_datetime,
        data.pricing_type,
        totalAmount,
        depositAmount,
        discountAmount
      );

      const bookingId = bookingResult.lastInsertRowid;

      // Create associated pending payment record
      db.prepare(`
        INSERT INTO payments (booking_id, amount, method, payment_status)
        VALUES (?, ?, 'Razorpay', 'Pending')
      `).run(bookingId, totalAmount);

      return {
        booking_id: bookingId,
        user_id: userId,
        vehicle_id: vehicle.vehicle_id,
        vehicle_name: `${vehicle.brand} ${vehicle.name}`,
        start_datetime: data.start_datetime,
        end_datetime: data.end_datetime,
        pricing_type: data.pricing_type,
        base_amount: baseAmount,
        discount_amount: discountAmount,
        deposit_amount: depositAmount,
        total_amount: totalAmount,
        status: 'Pending'
      };
    });

    const newBooking = transaction();
    res.status(201).json(newBooking);
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings/my (Customer's personal bookings)
function getMyBookings(req, res, next) {
  try {
    const userId = req.user.user_id;
    const bookings = db.prepare(`
      SELECT b.*,
        v.name AS vehicle_name,
        v.brand AS vehicle_brand,
        v.category AS vehicle_category,
        v.image_url AS vehicle_image,
        v.transmission,
        v.fuel_type,
        v.is_chauffeur_driven,
        p.payment_id,
        p.payment_status,
        p.razorpay_payment_id,
        p.paid_at,
        r.review_id,
        r.rating AS user_rating,
        r.comment AS user_comment
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id
      LEFT JOIN reviews r ON b.booking_id = r.booking_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/cancel (Customer)
function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (req.user.role !== 'admin' && booking.user_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
    }

    if (['Completed', 'Cancelled'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel a booking that is already ${booking.status}.` });
    }

    if (booking.status === 'Active') {
      return res.status(400).json({ error: 'Rental is currently in progress and cannot be cancelled directly.' });
    }

    db.transaction(() => {
      db.prepare("UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?").run(id);
      db.prepare("UPDATE payments SET payment_status = 'Refunded' WHERE booking_id = ? AND payment_status = 'Paid'").run(id);
      db.prepare("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = ?").run(booking.vehicle_id);
    })();

    const updated = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id);
    res.json({ message: 'Booking successfully cancelled.', booking: updated });
  } catch (err) {
    next(err);
  }
}

// GET /api/bookings (Admin: list all bookings)
function getAllBookings(req, res, next) {
  try {
    const { status, vehicle_id } = req.query;
    let query = `
      SELECT b.*,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        v.name AS vehicle_name,
        v.brand AS vehicle_brand,
        v.category AS vehicle_category,
        v.image_url AS vehicle_image,
        p.payment_status,
        p.razorpay_payment_id
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    if (vehicle_id) {
      query += ' AND b.vehicle_id = ?';
      params.push(vehicle_id);
    }

    query += ' ORDER BY b.created_at DESC';

    const bookings = db.prepare(query).all(...params);
    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/approve (Admin)
function approveBooking(req, res, next) {
  try {
    const { id } = req.params;
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    db.transaction(() => {
      db.prepare("UPDATE bookings SET status = 'Approved' WHERE booking_id = ?").run(id);
      db.prepare("UPDATE vehicles SET status = 'Rented' WHERE vehicle_id = ?").run(booking.vehicle_id);
    })();

    const updated = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id);
    res.json({ message: 'Booking approved successfully', booking: updated });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/reject (Admin)
function rejectBooking(req, res, next) {
  try {
    const { id } = req.params;
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    db.transaction(() => {
      db.prepare("UPDATE bookings SET status = 'Rejected' WHERE booking_id = ?").run(id);
      db.prepare("UPDATE payments SET payment_status = 'Refunded' WHERE booking_id = ?").run(id);
      db.prepare("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = ?").run(booking.vehicle_id);
    })();

    const updated = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id);
    res.json({ message: 'Booking rejected and payment scheduled for refund.', booking: updated });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/bookings/:id/complete (Admin: vehicle returned, calculate late fee)
function completeBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { actual_return_datetime, extra_fee, notes } = req.body;

    const booking = db.prepare(`
      SELECT b.*, v.price_per_hour, v.price_per_day
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE b.booking_id = ?
    `).get(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    let lateFee = Number(extra_fee) || 0;

    // Check if return is overdue
    const returnTime = actual_return_datetime ? new Date(actual_return_datetime) : new Date();
    const scheduledEnd = new Date(booking.end_datetime);

    if (returnTime > scheduledEnd && !extra_fee) {
      const overdueHours = Math.ceil((returnTime.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60));
      if (overdueHours > 0) {
        // 1.5x hourly rate for late hours
        lateFee = Math.round(overdueHours * (booking.price_per_hour * 1.5));
      }
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE bookings
        SET status = 'Completed', late_fee = ?
        WHERE booking_id = ?
      `).run(lateFee, id);

      db.prepare(`
        UPDATE vehicles
        SET status = 'Available'
        WHERE vehicle_id = ?
      `).run(booking.vehicle_id);
    })();

    const updated = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id);
    res.json({
      message: 'Rental completed and vehicle returned to available fleet.',
      booking: updated,
      late_fee: lateFee
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking,
  getAllBookings,
  approveBooking,
  rejectBooking,
  completeBooking
};
