const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken, requireAdmin);

// Reports Endpoints
router.get('/revenue', adminController.getRevenueReport);
router.get('/most-booked', adminController.getMostBooked);
router.get('/idle-vehicles', adminController.getIdleVehicles);
router.get('/customers', adminController.getCustomersReport);
router.get('/export', adminController.exportReport);

module.exports = router;
