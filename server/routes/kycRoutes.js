const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  submitKYCDocument,
  getMyKYCStatus,
  getAdminKYCList,
  verifyKYCDocument,
  verifyUserKYC
} = require('../controllers/kycController');

// Logged-in user routes (Customer or Owner)
router.post('/submit-document', authenticateToken, submitKYCDocument);
router.get('/status', authenticateToken, getMyKYCStatus);

// Admin-only verification routes
router.get('/admin/all', authenticateToken, requireRole('admin'), getAdminKYCList);
router.patch('/admin/verify-doc/:docId', authenticateToken, requireRole('admin'), verifyKYCDocument);
router.patch('/admin/user/:userId/status', authenticateToken, requireRole('admin'), verifyUserKYC);

module.exports = router;
