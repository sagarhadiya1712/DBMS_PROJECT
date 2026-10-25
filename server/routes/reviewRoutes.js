const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');

// Create review (Only authenticated users with completed bookings)
router.post('/', authenticateToken, reviewController.createReview);

// Public: Get reviews for a vehicle
router.get('/vehicle/:id', reviewController.getReviewsByVehicle);

module.exports = router;
