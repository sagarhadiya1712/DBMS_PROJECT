const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const target = err.meta?.target ? ` (${err.meta.target})` : '';
    return errorResponse(res, `A record with this unique field already exists${target}.`, 409);
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return errorResponse(res, 'Requested resource was not found.', 404);
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    return errorResponse(res, `File upload error: ${err.message}`, 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode);
};

module.exports = errorHandler;
