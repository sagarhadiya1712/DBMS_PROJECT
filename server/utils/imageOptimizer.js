const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const VEHICLES_DIR = path.join(UPLOADS_DIR, 'vehicles');
const THUMBS_DIR = path.join(VEHICLES_DIR, 'thumbs');

[UPLOADS_DIR, VEHICLES_DIR, THUMBS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Optimizes an uploaded image using Sharp:
 * - Resizes main photo to max 1280px width, WebP quality 80
 * - Generates thumbnail at 400px width, WebP quality 80
 * @param {Buffer|string} input - File buffer or file path
 * @param {string} baseName - Base identifier for the file (UUID)
 * @returns {Promise<{ filePath: string, thumbPath: string }>}
 */
async function processVehicleImage(input, baseName) {
  const mainFilename = `${baseName}.webp`;
  const thumbFilename = `${baseName}_thumb.webp`;

  const mainDiskPath = path.join(VEHICLES_DIR, mainFilename);
  const thumbDiskPath = path.join(THUMBS_DIR, thumbFilename);

  // 1. Process Main Image (max 1280px, quality 80)
  await sharp(input)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(mainDiskPath);

  // 2. Process Thumbnail Image (400px width, quality 80)
  await sharp(input)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(thumbDiskPath);

  // Return relative web URLs
  return {
    filePath: `/uploads/vehicles/${mainFilename}`,
    thumbPath: `/uploads/vehicles/thumbs/${thumbFilename}`,
    mainDiskPath,
    thumbDiskPath
  };
}

module.exports = {
  processVehicleImage,
  UPLOADS_DIR,
  VEHICLES_DIR,
  THUMBS_DIR
};
