const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  uploadPrivate,
  uploadVehiclePhotos,
  uploadVehicleImagesHandler,
  uploadPrivateDocumentHandler,
  getPrivateFile
} = require('../controllers/fileController');

// Multer error handling wrapper
function handleMulterErrors(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
}

// Upload public vehicle photos (Optimized with sharp into webp + thumb)
router.post(
  '/upload-vehicle-photos',
  authenticateToken,
  handleMulterErrors(uploadVehiclePhotos.array('photos', 10)),
  uploadVehicleImagesHandler
);

// Upload private documents (KYC, RC, Insurance, etc.)
router.post(
  '/upload-private-doc',
  authenticateToken,
  handleMulterErrors(uploadPrivate.single('document')),
  uploadPrivateDocumentHandler
);

// Secure streaming of private documents (Login + Owner or Admin required)
router.get('/:type/:id', authenticateToken, getPrivateFile);

module.exports = router;
