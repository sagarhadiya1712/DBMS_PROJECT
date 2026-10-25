const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protected Customer/Admin Payment Actions
router.post('/create-order', authenticateToken, paymentController.createOrder);
router.post('/verify', authenticateToken, paymentController.verifyPayment);
router.post('/:bookingId/retry', authenticateToken, paymentController.retryPayment);
router.delete('/:id', authenticateToken, requireAdmin, paymentController.deletePayment);

// Razorpay Webhook (Public, signature-verified)
router.post('/webhook', paymentController.handleWebhook);

// PDF Invoice Download (Token or query auth can be used, allow authenticated or direct booking ID access)
router.get('/invoice/:bookingId', paymentController.getInvoice);

module.exports = router;
