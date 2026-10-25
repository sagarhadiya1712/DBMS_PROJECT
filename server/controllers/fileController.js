const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const db = require('../db/db');
const { optimizeVehicleImage } = require('../utils/imageOptimizer');

// Storage destination configurations
const PRIVATE_DIR = path.resolve(__dirname, '..', 'private_uploads');
const VEHICLES_DIR = path.resolve(__dirname, '..', 'uploads', 'vehicles');

// Ensure directories exist
if (!fs.existsSync(PRIVATE_DIR)) fs.mkdirSync(PRIVATE_DIR, { recursive: true });
if (!fs.existsSync(VEHICLES_DIR)) fs.mkdirSync(VEHICLES_DIR, { recursive: true });

// Allowed file types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

// File filter function
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF files under 5MB are accepted.'));
  }
  cb(null, true);
};

// Multer storage for private uploads (KYC & Vehicle Documents)
const privateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PRIVATE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

// Multer storage for vehicle photos (Public uploads, before sharp optimization)
const vehiclePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VEHICLES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `raw_${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

// Multer upload middlewares (Max 5MB)
const uploadPrivate = multer({
  storage: privateStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter
});

const uploadVehiclePhotos = multer({
  storage: vehiclePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Vehicle photos only accept images, not PDF
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Vehicle photos must be JPG, PNG, or WEBP images under 5MB.'));
    }
    cb(null, true);
  }
});

/**
 * Handle vehicle photo upload & sharp optimization
 */
async function uploadVehicleImagesHandler(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const processedImages = [];
    for (const file of req.files) {
      try {
        const result = await optimizeVehicleImage(file.path, VEHICLES_DIR);
        // Clean up temporary raw file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        processedImages.push({
          file_name: result.fileName,
          file_path: result.filePath,
          thumb_path: result.thumbPath,
          original_name: file.originalname,
          size_bytes: result.sizeBytes
        });
      } catch (err) {
        console.error('Sharp optimization error:', err);
        // Fallback if sharp fails
        processedImages.push({
          file_name: path.basename(file.path),
          file_path: `/uploads/vehicles/${path.basename(file.path)}`,
          thumb_path: `/uploads/vehicles/${path.basename(file.path)}`,
          original_name: file.originalname,
          size_bytes: file.size
        });
      }
    }

    res.json({
      message: 'Images uploaded and optimized successfully.',
      images: processedImages
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle private file upload (Single document)
 */
function uploadPrivateDocumentHandler(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded.' });
    }

    res.json({
      message: 'Document uploaded securely.',
      file_name: req.file.filename,
      stored_path: req.file.filename, // Store filename relative to private_uploads
      original_name: req.file.originalname,
      size_bytes: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/files/:type/:id
 * Securely stream private documents (KYC or Vehicle docs)
 * Only allowed for Admin OR the Owner of the document
 */
function getPrivateFile(req, res, next) {
  try {
    const { type, id } = req.params;
    const currentUser = req.user;

    let targetFilename = null;

    if (type === 'kyc') {
      const doc = db.prepare('SELECT * FROM kyc_documents WHERE doc_id = ?').get(id);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      // Check permission: Admin OR document owner
      if (currentUser.role !== 'admin' && doc.user_id !== currentUser.user_id) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to view this private document.' });
      }

      targetFilename = path.basename(doc.file_path);
    } else if (type === 'vehicle_doc') {
      const doc = db.prepare(`
        SELECT vd.*, v.owner_id
        FROM vehicle_documents vd
        JOIN vehicles v ON vd.vehicle_id = v.vehicle_id
        WHERE vd.doc_id = ?
      `).get(id);

      if (!doc) {
        return res.status(404).json({ error: 'Vehicle document not found.' });
      }

      // Check permission: Admin OR vehicle owner
      if (currentUser.role !== 'admin' && doc.owner_id !== currentUser.user_id) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to view this vehicle document.' });
      }

      targetFilename = path.basename(doc.file_url || doc.file_path);
    } else {
      return res.status(400).json({ error: 'Invalid document type. Allowed types: kyc, vehicle_doc' });
    }

    const fullFilePath = path.join(PRIVATE_DIR, targetFilename);

    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).json({ error: 'File not found on server storage.' });
    }

    // Set secure headers and stream file
    const ext = path.extname(fullFilePath).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : (ext === '.png' ? 'image/png' : 'image/jpeg');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${targetFilename}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    res.sendFile(fullFilePath);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadPrivate,
  uploadVehiclePhotos,
  uploadVehicleImagesHandler,
  uploadPrivateDocumentHandler,
  getPrivateFile
};
