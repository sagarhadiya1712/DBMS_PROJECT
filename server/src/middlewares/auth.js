const { verifyAccessToken } = require('../utils/token');
const { errorResponse } = require('../utils/response');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication token required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!user) {
      return errorResponse(res, 'User no longer exists', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      roleId: user.roleId,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired. Please refresh your session.', 401);
    }
    return errorResponse(res, 'Invalid authentication token', 401);
  }
};

// Optional auth: populates req.user if token present, but does not block guests
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role.name,
        roleId: user.roleId,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }
  } catch (e) {
    // ignore token errors for optional auth
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth,
};
