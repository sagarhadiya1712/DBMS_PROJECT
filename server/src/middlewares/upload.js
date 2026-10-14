const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure upload directory exists in a serverless-safe writable location (/tmp on Vercel)
const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.resolve(config.UPLOAD_DIR);

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create uploadDir at startup:', e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (e) {}
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedTypes.test(ext) && (mime.startsWith('image/') || mime === 'application/pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp) and PDFs are allowed!'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

module.exports = upload;
