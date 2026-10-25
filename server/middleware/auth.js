const { verifyToken } = require('../utils/jwt');
const db = require('../db/db');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = verifyToken(token);
    const user = db.prepare(`
      SELECT user_id, name, phone, email, role, is_verified, is_blocked, google_id, created_at
      FROM users WHERE user_id = ?
    `).get(decoded.user_id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = db.prepare(`
        SELECT user_id, name, phone, email, role, is_verified, is_blocked, google_id, created_at
        FROM users WHERE user_id = ?
      `).get(decoded.user_id);

      if (user && !user.is_blocked) {
        req.user = user;
      }
    } catch (err) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access forbidden. Requires ${role} privileges.` });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin: requireRole('admin')
};
