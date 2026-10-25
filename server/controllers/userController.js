const db = require('../db/db');
const { logAudit } = require('../utils/auditLogger');

// GET /api/users (Admin)
function getUsers(req, res, next) {
  try {
    const { search, role, kyc_status } = req.query;
    let query = `
      SELECT user_id, name, phone, email, role, is_verified, is_blocked, kyc_status, kyc_rejection_reason, created_at,
        (SELECT count(*) FROM bookings WHERE bookings.user_id = users.user_id) AS booking_count
      FROM users
      WHERE deleted_at IS NULL
    `;
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role && role !== 'all') {
      query += ` AND role = ?`;
      params.push(role);
    }

    if (kyc_status && kyc_status !== 'all') {
      query += ` AND kyc_status = ?`;
      params.push(kyc_status);
    }

    query += ` ORDER BY created_at DESC`;

    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/block (Admin)
function toggleBlockUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT user_id, role, is_blocked FROM users WHERE user_id = ?').get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Admin accounts cannot be suspended.' });
    }

    const newBlockedState = user.is_blocked ? 0 : 1;
    db.prepare('UPDATE users SET is_blocked = ? WHERE user_id = ?').run(newBlockedState, id);

    logAudit(req.user.user_id, newBlockedState ? 'BLOCK_USER' : 'UNBLOCK_USER', 'users', id);

    res.json({
      message: `User account has been ${newBlockedState ? 'blocked' : 'unblocked'}.`,
      user_id: id,
      is_blocked: newBlockedState
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/:id (Admin soft delete)
function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT user_id, role FROM users WHERE user_id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Admin accounts cannot be deleted.' });
    }

    db.prepare("UPDATE users SET deleted_at = datetime('now') WHERE user_id = ?").run(id);

    logAudit(req.user.user_id, 'SOFT_DELETE_USER', 'users', id);

    res.json({ message: 'User soft deleted successfully.', user_id: id });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/profile (Customer/Admin self-edit)
function updateProfile(req, res, next) {
  try {
    const userId = req.user.user_id;
    const { name, phone } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    db.prepare(`
      UPDATE users SET name = ?, phone = ?
      WHERE user_id = ?
    `).run(name.trim(), phone || null, userId);

    const updated = db.prepare(`
      SELECT user_id, name, phone, email, role, is_verified, is_blocked, kyc_status, created_at
      FROM users WHERE user_id = ?
    `).get(userId);

    res.json({
      message: 'Profile updated successfully',
      user: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  toggleBlockUser,
  deleteUser,
  updateProfile
};
