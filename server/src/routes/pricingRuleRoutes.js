const express = require('express');
const router = express.Router();
const controller = require('../controllers/pricingRuleController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

// Pricing rules
router.get('/rules', controller.listPricingRules);
router.post('/rules', authenticate, requireRole('ADMIN', 'MANAGER'), controller.createPricingRule);

// Promo codes
router.get('/promos', authenticate, requireRole('ADMIN', 'MANAGER'), controller.listPromos);
router.post('/promos', authenticate, requireRole('ADMIN'), controller.createPromo);
router.post('/validate-promo', controller.validatePromo);

module.exports = router;
