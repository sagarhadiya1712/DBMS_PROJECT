const { generateInvoicePDF } = require('../services/invoiceService');
const prisma = require('../config/db');
const { errorResponse } = require('../utils/response');

const getInvoice = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (req.user.role === 'CUSTOMER' && booking.customerId !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    await generateInvoicePDF(bookingId, res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInvoice,
};
