const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middlewares/auth');

router.get('/:bookingId', authenticate, invoiceController.getInvoice);

module.exports = router;
