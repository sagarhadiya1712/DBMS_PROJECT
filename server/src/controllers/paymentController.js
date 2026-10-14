const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    const order = await paymentService.createOrder({
      amount: booking.totalPrice,
      currency: 'INR',
      receipt: booking.bookingReference,
      notes: { bookingId: booking.id, customerId: booking.customerId },
    });

    return successResponse(res, order, 'Razorpay order created');
  } catch (err) {
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const {
      bookingId,
      orderId,
      paymentId,
      signature,
      amount,
      method = 'card',
    } = req.body;

    if (!bookingId || !orderId || !paymentId) {
      return errorResponse(res, 'Missing payment confirmation parameters', 400);
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, vehicle: true },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    const { payment, booking: updatedBooking } = await paymentService.processPaymentConfirmation({
      bookingId,
      orderId,
      paymentId,
      signature,
      amount: amount || booking.totalPrice,
      method,
    });

    // Notify customer on multiple channels (in-app, email, SMS)
    await notificationService.notifyBookingConfirmed(
      updatedBooking,
      booking.customer,
      booking.vehicle
    );

    await logAudit({
      actorId: req.user.id,
      action: 'PAYMENT_CAPTURED',
      entity: 'PAYMENT',
      entityId: payment.id,
      details: { amount: payment.amount, transactionId: payment.transactionId },
      req,
    });

    return successResponse(
      res,
      { payment, booking: updatedBooking },
      'Payment verified and booking confirmed successfully!'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
