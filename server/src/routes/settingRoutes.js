const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const {
  getPublicSettings,
  getAllSettingsAdmin,
  updateSettings,
} = require('../controllers/settingController');

// Public route to get public company and system settings
router.get('/', getPublicSettings);

// Admin routes to view details and update system settings
router.get('/admin', authenticate, requireRole('ADMIN'), getAllSettingsAdmin);
router.put('/', authenticate, requireRole('ADMIN'), updateSettings);

module.exports = router;
