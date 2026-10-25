const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate a runtime session secret if not supplied in environment
const fallbackSecret = crypto.randomBytes(32).toString('hex');
const JWT_SECRET = process.env.JWT_SECRET || fallbackSecret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signToken,
  verifyToken,
  JWT_SECRET,
};
