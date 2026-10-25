const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Protected Customer/Admin Payment Actions
router.post('/create-order', authenticateToken, paymentController.createOrder);
router.post('/verify', authenticateToken, paymentController.verifyPayment);

// PDF Invoice Download (Token or query auth can be used, allow authenticated or direct booking ID access)
router.get('/invoice/:bookingId', paymentController.getInvoice);

module.exports = router;
