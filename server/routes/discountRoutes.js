const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public / Customer: validate promo code
router.post('/validate', discountController.validateDiscount);

// Admin: CRUD operations
router.get('/', authenticateToken, requireAdmin, discountController.getDiscounts);
router.post('/', authenticateToken, requireAdmin, discountController.createDiscount);
router.put('/:id', authenticateToken, requireAdmin, discountController.updateDiscount);
router.delete('/:id', authenticateToken, requireAdmin, discountController.deleteDiscount);

module.exports = router;
