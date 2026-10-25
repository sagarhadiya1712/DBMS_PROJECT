const { z } = require('zod');
const db = require('../db/db');

const reviewSchema = z.object({
  booking_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(2, 'Review comment must be at least 2 characters')
});

// POST /api/reviews (Only for completed bookings)
function createReview(req, res, next) {
  try {
    const { booking_id, rating, comment } = reviewSchema.parse(req.body);
    const userId = req.user.user_id;

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(booking_id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are only allowed to review your own bookings.' });
    }

    if (booking.status !== 'Completed') {
      return res.status(400).json({
        error: 'Reviews can only be submitted after the rental trip is marked Completed.'
      });
    }

    // Check if review already exists
    const existing = db.prepare('SELECT * FROM reviews WHERE booking_id = ?').get(booking_id);
    if (existing) {
      return res.status(409).json({ error: 'You have already submitted a review for this booking.' });
    }

    const result = db.prepare(`
      INSERT INTO reviews (user_id, vehicle_id, booking_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, booking.vehicle_id, booking_id, rating, comment);

    const review = db.prepare(`
      SELECT r.*, u.name AS reviewer_name
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.review_id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

// GET /api/reviews/vehicle/:id
function getReviewsByVehicle(req, res, next) {
  try {
    const { id } = req.params;
    const reviews = db.prepare(`
      SELECT r.*, u.name AS reviewer_name
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.vehicle_id = ?
      ORDER BY r.created_at DESC
    `).all(id);

    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReview,
  getReviewsByVehicle
};
