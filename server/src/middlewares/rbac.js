const { errorResponse } = require('../utils/response');

/**
 * RBAC middleware: ensures req.user has one of the allowed roles
 * Usage: requireRole('ADMIN', 'MANAGER')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        403
      );
    }

    next();
  };
};

module.exports = {
  requireRole,
};
