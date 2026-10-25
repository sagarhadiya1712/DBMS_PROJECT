const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Public Auth Endpoints
router.post('/signup', authLimiter, authController.signup);
router.post('/verify-otp', otpLimiter, authController.verifyOtp);
router.post('/resend-otp', otpLimiter, authController.resendOtp);
router.post('/login', authLimiter, authController.login);

// Google OAuth
router.post('/google', authController.googleAuth);
router.get('/google', (req, res) => {
  res.redirect('/api/auth/google/callback');
});
router.get('/google/callback', (req, res) => {
  res.json({ message: 'Google OAuth callback handler. In single-page apps, use POST /api/auth/google.' });
});

// Protected Profile Endpoint
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
