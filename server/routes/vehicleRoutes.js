const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public Listing & Details
router.get('/', vehicleController.listVehicles);
router.get('/:id', vehicleController.getVehicleById);

// Admin Vehicle Management
router.post('/', authenticateToken, requireAdmin, vehicleController.createVehicle);
router.put('/:id', authenticateToken, requireAdmin, vehicleController.updateVehicle);
router.delete('/:id', authenticateToken, requireAdmin, vehicleController.deleteVehicle);
router.patch('/:id/status', authenticateToken, requireAdmin, vehicleController.updateVehicleStatus);

module.exports = router;
