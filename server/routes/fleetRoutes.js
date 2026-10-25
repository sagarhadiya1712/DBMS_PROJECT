const express = require('express');
const router = express.Router();
const fleetController = require('../controllers/fleetController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All fleet management endpoints are restricted to Admin
router.use(authenticateToken, requireAdmin);

// Alerts (Service, Insurance, Permit expiring within 15 days)
router.get('/alerts', fleetController.getFleetAlerts);

// Maintenance CRUD
router.get('/maintenance', fleetController.getMaintenance);
router.post('/maintenance', fleetController.createMaintenance);
router.put('/maintenance/:id', fleetController.updateMaintenance);
router.delete('/maintenance/:id', fleetController.deleteMaintenance);

// Fuel CRUD
router.get('/fuel', fleetController.getFuel);
router.post('/fuel', fleetController.createFuel);
router.delete('/fuel/:id', fleetController.deleteFuel);

// Drivers CRUD
router.get('/drivers', fleetController.getDrivers);
router.post('/drivers', fleetController.createDriver);
router.put('/drivers/:id', fleetController.updateDriver);
router.delete('/drivers/:id', fleetController.deleteDriver);

// Documents CRUD
router.get('/documents', fleetController.getDocuments);
router.post('/documents', fleetController.createDocument);
router.delete('/documents/:id', fleetController.deleteDocument);

module.exports = router;
