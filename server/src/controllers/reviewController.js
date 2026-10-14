const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const customerId = req.user.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.customerId !== customerId) {
      return errorResponse(res, 'You can only review your own booking', 403);
    }

    if (booking.status !== 'COMPLETED') {
      return errorResponse(res, 'You can only review a completed rental', 400);
    }

    // Check if already reviewed
    const existing = await prisma.review.findFirst({
      where: { bookingId },
    });

    if (existing) {
      return errorResponse(res, 'You have already submitted a review for this booking', 400);
    }

    const review = await prisma.review.create({
      data: {
        bookingId,
        vehicleId: booking.vehicleId,
        customerId,
        rating: Math.max(1, Math.min(5, Number(rating))),
        comment,
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
    });

    return successResponse(res, review, 'Review submitted successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getVehicleReviews = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { vehicleId, isPublished: true },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(res, reviews, 'Reviews retrieved');
  } catch (err) {
    next(err);
  }
};

const replyToReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    const updated = await prisma.review.update({
      where: { id },
      data: { reply },
    });

    return successResponse(res, updated, 'Reply added to review');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReview,
  getVehicleReviews,
  replyToReview,
};
