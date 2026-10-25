const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken, requireAdmin);

// GET /api/admin/stats
router.get('/stats', adminController.getStats);

module.exports = router;
