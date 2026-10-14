const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const upload = require('../middlewares/upload');

// Public/Renter routes
router.get('/', optionalAuth, vehicleController.getVehicles);
router.get('/:id', optionalAuth, vehicleController.getVehicleById);

// Staff / Manager / Admin fleet management routes
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  vehicleController.createVehicle
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  vehicleController.updateVehicle
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  vehicleController.deleteVehicle
);

router.post(
  '/:id/images',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  upload.single('image'),
  vehicleController.uploadVehicleImage
);

module.exports = router;
