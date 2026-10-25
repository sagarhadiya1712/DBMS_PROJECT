const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const paymentController = require('../controllers/paymentController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken, requireAdmin);

// Dashboard & stats
router.get('/stats', adminController.getStats);
router.get('/dashboard', adminController.getStats);

// COD cash collection
router.patch('/payments/:paymentId/collect-cash', paymentController.collectCashPayment);

// Vehicle Approvals
router.get('/vehicles/pending', adminController.getPendingVehicles);
router.patch('/vehicles/:id/approval', adminController.verifyVehicleApproval);

// Owners Management
router.get('/owners', adminController.getAdminOwners);

// Payouts Management
router.get('/payouts', adminController.getAdminPayouts);
router.patch('/payouts/:id/pay', adminController.markPayoutPaid);

module.exports = router;
