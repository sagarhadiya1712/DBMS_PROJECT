const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const paymentController = require('../controllers/paymentController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken, requireAdmin);

// GET /api/admin/stats
router.get('/stats', adminController.getStats);
router.get('/dashboard', adminController.getStats);

// PATCH /api/admin/payments/:paymentId/collect-cash
router.patch('/payments/:paymentId/collect-cash', paymentController.collectCashPayment);

module.exports = router;
