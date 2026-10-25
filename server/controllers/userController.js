const db = require('../db/db');

// GET /api/users (Admin)
function getUsers(req, res, next) {
  try {
    const { search } = req.query;
    let query = `
      SELECT user_id, name, phone, email, role, is_verified, is_blocked, created_at,
        (SELECT count(*) FROM bookings WHERE bookings.user_id = users.user_id) AS booking_count
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

    res.json({
      message: `User account has been ${newBlockedState ? 'blocked' : 'unblocked'}.`,
      user_id: id,
      is_blocked: newBlockedState
    });
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
      SELECT user_id, name, phone, email, role, is_verified, is_blocked, created_at
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
  updateProfile
};
