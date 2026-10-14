const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.post('/', authenticate, reviewController.createReview);
router.get('/vehicle/:vehicleId', reviewController.getVehicleReviews);
router.put('/:id/reply', authenticate, requireRole('ADMIN', 'MANAGER'), reviewController.replyToReview);

module.exports = router;
