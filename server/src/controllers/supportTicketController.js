const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const listTickets = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'CUSTOMER') {
      where.userId = req.user.id;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, tickets, 'Support tickets retrieved');
  } catch (err) {
    next(err);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const { subject, category, priority = 'MEDIUM', message } = req.body;
    const userId = req.user.id;

    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;
    const initialMessage = [
      {
        sender: req.user.role.toLowerCase(),
        senderName: `${req.user.firstName} ${req.user.lastName}`,
        text: message,
        time: new Date().toISOString(),
      },
    ];

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject,
        category: category || 'GENERAL',
        priority,
        status: 'OPEN',
        messages: JSON.stringify(initialMessage),
      },
    });

    return successResponse(res, ticket, 'Ticket created', 201);
  } catch (err) {
    next(err);
  }
};

const addMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404);
    }

    const currentMessages = JSON.parse(ticket.messages || '[]');
    currentMessages.push({
      sender: req.user.role.toLowerCase(),
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      text,
      time: new Date().toISOString(),
    });

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        messages: JSON.stringify(currentMessages),
        status: req.user.role === 'CUSTOMER' ? 'OPEN' : 'IN_PROGRESS',
      },
    });

    return successResponse(res, updated, 'Message appended');
  } catch (err) {
    next(err);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { status },
    });

    return successResponse(res, updated, 'Ticket status updated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTickets,
  createTicket,
  addMessage,
  updateTicketStatus,
};
