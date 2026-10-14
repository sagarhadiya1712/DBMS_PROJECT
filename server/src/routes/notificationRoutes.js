const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, controller.getMyNotifications);
router.put('/:id/read', authenticate, controller.markAsRead);
router.put('/read-all', authenticate, controller.markAllAsRead);

module.exports = router;
