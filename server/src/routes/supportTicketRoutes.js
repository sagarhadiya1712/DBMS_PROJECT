const express = require('express');
const router = express.Router();
const controller = require('../controllers/supportTicketController');
const { authenticate } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

router.get('/', authenticate, controller.listTickets);
router.post('/', authenticate, controller.createTicket);
router.post('/:id/messages', authenticate, controller.addMessage);
router.put('/:id/status', authenticate, requireRole('ADMIN', 'MANAGER', 'STAFF'), controller.updateTicketStatus);

module.exports = router;
