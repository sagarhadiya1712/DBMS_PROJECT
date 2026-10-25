const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Customer Endpoints (Protected)
router.post('/', authenticateToken, bookingController.createBooking);
router.get('/my', authenticateToken, bookingController.getMyBookings);
router.patch('/:id/cancel', authenticateToken, bookingController.cancelBooking);

// Admin Endpoints
router.get('/', authenticateToken, requireAdmin, bookingController.getAllBookings);
router.patch('/:id/approve', authenticateToken, requireAdmin, bookingController.approveBooking);
router.patch('/:id/reject', authenticateToken, requireAdmin, bookingController.rejectBooking);
router.patch('/:id/complete', authenticateToken, requireAdmin, bookingController.completeBooking);

module.exports = router;
