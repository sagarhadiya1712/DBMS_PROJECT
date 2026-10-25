const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getOwnerProfile,
  saveOwnerProfile,
  addOwnerVehicle,
  getOwnerVehicles,
  getOwnerVehicleDetails,
  toggleVehicleAvailability,
  getOwnerBookings,
  markCodReceived,
  getOwnerDashboard,
  getOwnerPayouts
} = require('../controllers/ownerController');

// All owner routes require authentication and 'owner' or 'admin' role
router.use(authenticateToken);
router.use(requireRole(['owner', 'admin']));

// Profile
router.get('/profile', getOwnerProfile);
router.post('/profile', saveOwnerProfile);

// Dashboard & stats
router.get('/dashboard', getOwnerDashboard);

// Vehicles
router.get('/vehicles', getOwnerVehicles);
router.post('/vehicles', addOwnerVehicle);
router.get('/vehicles/:id', getOwnerVehicleDetails);
router.patch('/vehicles/:id/availability', toggleVehicleAvailability);

// Bookings & COD
router.get('/bookings', getOwnerBookings);
router.patch('/bookings/:id/cod-received', markCodReceived);

// Payouts
router.get('/payouts', getOwnerPayouts);

module.exports = router;
