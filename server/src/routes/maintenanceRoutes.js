const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'MANAGER', 'STAFF'),
  maintenanceController.listMaintenance
);

router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  maintenanceController.createMaintenance
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'MANAGER', 'STAFF'),
  maintenanceController.updateMaintenance
);

router.get(
  '/alerts',
  authenticate,
  requireRole('ADMIN', 'MANAGER', 'STAFF'),
  maintenanceController.getComplianceAlerts
);

module.exports = router;
