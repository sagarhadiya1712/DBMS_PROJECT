const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

// All admin routes require ADMIN or MANAGER role
router.use(authenticate, requireRole('ADMIN', 'MANAGER'));

router.get('/dashboard', adminController.getDashboardMetrics);
router.get('/users', requireRole('ADMIN'), adminController.getUsers);
router.put('/users/:id/role', requireRole('ADMIN'), adminController.updateUserRole);
router.get('/audit-logs', requireRole('ADMIN'), adminController.getAuditLogs);
router.get('/reports', adminController.exportReports);

module.exports = router;
