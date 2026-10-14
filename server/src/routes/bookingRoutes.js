const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.post('/quote', bookingController.getPriceQuote);
router.post('/', authenticate, bookingController.createBooking);
router.get('/my-bookings', authenticate, bookingController.getMyBookings);
router.get(
  '/all',
  authenticate,
  requireRole('ADMIN', 'MANAGER', 'STAFF'),
  bookingController.getAllBookings
);
router.get('/:id', authenticate, bookingController.getBookingById);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);

module.exports = router;
