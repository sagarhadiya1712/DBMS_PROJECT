const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const checkinCheckoutRoutes = require('./checkinCheckoutRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const reviewRoutes = require('./reviewRoutes');
const maintenanceRoutes = require('./maintenanceRoutes');
const branchRoutes = require('./branchRoutes');
const pricingRuleRoutes = require('./pricingRuleRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');
const supportTicketRoutes = require('./supportTicketRoutes');
const settingRoutes = require('./settingRoutes');

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/inspections', checkinCheckoutRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/reviews', reviewRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/branches', branchRoutes);
router.use('/pricing', pricingRuleRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/support', supportTicketRoutes);
router.use('/settings', settingRoutes);

module.exports = router;
