const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Self profile update (Any authenticated user)
router.patch('/profile', authenticateToken, userController.updateProfile);

// Admin user management
router.get('/', authenticateToken, requireAdmin, userController.getUsers);
router.patch('/:id/block', authenticateToken, requireAdmin, userController.toggleBlockUser);
router.delete('/:id', authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router;
