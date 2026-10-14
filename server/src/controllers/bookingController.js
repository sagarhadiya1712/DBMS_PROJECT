const prisma = require('../config/db');
const { calculateRentalPrice } = require('../services/pricingService');
const { checkVehicleAvailability, generateBookingReference } = require('../services/bookingService');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../utils/audit');

/**
 * Preview pricing breakdown before booking
 */
const getPriceQuote = async (req, res, next) => {
  try {
    const { vehicleId, startDateTime, endDateTime, promoCode } = req.body;

    if (!vehicleId || !startDateTime || !endDateTime) {
      return errorResponse(res, 'vehicleId, startDateTime, and endDateTime are required', 400);
    }

    const availability = await checkVehicleAvailability(vehicleId, startDateTime, endDateTime);
    if (!availability.available) {
      return errorResponse(res, availability.reason, 400);
    }

    const quote = await calculateRentalPrice({
      vehicleId,
      startDateTime,
      endDateTime,
      promoCode,
    });

    return successResponse(res, quote, 'Price quote calculated');
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new booking
 */
const createBooking = async (req, res, next) => {
  try {
    const {
      vehicleId,
      pickupBranchId,
      dropBranchId,
      startDateTime,
      endDateTime,
      promoCode,
    } = req.body;

    const customerId = req.user.id;

    if (!vehicleId || !pickupBranchId || !dropBranchId || !startDateTime || !endDateTime) {
      return errorResponse(res, 'Missing required booking parameters', 400);
    }

    // 1. Strict overlap check
    const availability = await checkVehicleAvailability(vehicleId, startDateTime, endDateTime);
    if (!availability.available) {
      return errorResponse(res, `Vehicle is not available: ${availability.reason}`, 409);
    }

    // 2. Price calculation
    const pricing = await calculateRentalPrice({
      vehicleId,
      startDateTime,
      endDateTime,
      promoCode,
    });

    const bookingReference = generateBookingReference();

    // 3. Create booking inside transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Re-check inside transaction to eliminate race conditions
      const conflict = await tx.booking.findFirst({
        where: {
          vehicleId,
          status: { in: ['CONFIRMED', 'CHECKED_OUT', 'PENDING'] },
          AND: [
            { startDateTime: { lt: new Date(endDateTime) } },
            { endDateTime: { gt: new Date(startDateTime) } },
          ],
        },
      });

      if (conflict) {
        throw new Error('Vehicle was just reserved by another customer. Please select another slot.');
      }

      const newBooking = await tx.booking.create({
        data: {
          bookingReference,
          customerId,
          vehicleId,
          pickupBranchId,
          dropBranchId,
          startDateTime: new Date(startDateTime),
          endDateTime: new Date(endDateTime),
          totalHours: pricing.totalHours,
          totalDays: pricing.totalDays,
          basePrice: pricing.basePrice,
          discountAmount: pricing.discountAmount,
          taxAmount: pricing.taxAmount,
          depositAmount: pricing.depositAmount,
          totalPrice: pricing.totalPrice,
          status: 'PENDING', // Will transition to CONFIRMED on payment
          promoCodeId: pricing.appliedPromo?.id || null,
        },
        include: {
          vehicle: true,
          pickupBranch: true,
          dropBranch: true,
          customer: true,
        },
      });

      // Increment promo usage if applied
      if (pricing.appliedPromo) {
        await tx.promoCode.update({
          where: { id: pricing.appliedPromo.id },
          data: { timesUsed: { increment: 1 } },
        });
      }

      return newBooking;
    });

    // 4. Create Razorpay Test Order
    const razorpayOrder = await paymentService.createOrder({
      amount: booking.totalPrice,
      currency: 'INR',
      receipt: booking.bookingReference,
      notes: {
        bookingId: booking.id,
        customerId: booking.customerId,
      },
    });

    await logAudit({
      actorId: customerId,
      action: 'CREATE',
      entity: 'BOOKING',
      entityId: booking.id,
      details: { reference: booking.bookingReference, amount: booking.totalPrice },
      req,
    });

    return successResponse(
      res,
      {
        booking,
        razorpayOrder,
      },
      'Booking initiated successfully. Please complete payment.',
      201
    );
  } catch (err) {
    next(err);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { customerId: req.user.id },
      include: {
        vehicle: {
          include: { images: true },
        },
        pickupBranch: true,
        dropBranch: true,
        payments: true,
        inspections: true,
        reviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, bookings, 'Customer bookings retrieved');
  } catch (err) {
    next(err);
  }
};

const getAllBookings = async (req, res, next) => {
  try {
    const { status, branchId, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (branchId) where.pickupBranchId = branchId;
    if (search) {
      where.OR = [
        { bookingReference: { contains: search } },
        { customer: { firstName: { contains: search } } },
        { customer: { lastName: { contains: search } } },
        { customer: { email: { contains: search } } },
        { vehicle: { licensePlate: { contains: search } } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: true,
        vehicle: {
          include: { images: true },
        },
        pickupBranch: true,
        dropBranch: true,
        payments: true,
        inspections: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, bookings, 'All bookings retrieved');
  } catch (err) {
    next(err);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: {
          include: { images: true, branch: true },
        },
        pickupBranch: true,
        dropBranch: true,
        payments: true,
        inspections: {
          include: { staff: { select: { firstName: true, lastName: true } } },
        },
        reviews: true,
      },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // If customer, ensure they own the booking
    if (req.user.role === 'CUSTOMER' && booking.customerId !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, booking, 'Booking details retrieved');
  } catch (err) {
    next(err);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { vehicle: true, customer: true },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (req.user.role === 'CUSTOMER' && booking.customerId !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    if (['COMPLETED', 'CHECKED_OUT'].includes(booking.status)) {
      return errorResponse(res, `Cannot cancel booking that is currently ${booking.status}`, 400);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || 'Cancelled by user',
      },
    });

    await logAudit({
      actorId: req.user.id,
      action: 'CANCEL',
      entity: 'BOOKING',
      entityId: id,
      details: { reason: cancellationReason },
      req,
    });

    await notificationService.sendInAppNotification({
      userId: booking.customerId,
      title: 'Booking Cancelled',
      message: `Your booking ${booking.bookingReference} has been cancelled. Any refund will be processed to the original payment method.`,
      type: 'BOOKING',
    });

    return successResponse(res, updated, 'Booking cancelled successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPriceQuote,
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  cancelBooking,
};
