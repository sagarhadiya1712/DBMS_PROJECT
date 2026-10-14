const express = require('express');
const router = express.Router();
const controller = require('../controllers/checkinCheckoutController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'MANAGER', 'STAFF'),
  controller.createInspection
);

router.get('/booking/:bookingId', authenticate, controller.getBookingInspections);

module.exports = router;
