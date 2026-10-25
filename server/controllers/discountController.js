const db = require('../db/db');

// GET /api/discounts (Admin)
function getDiscounts(req, res, next) {
  try {
    const discounts = db.prepare('SELECT * FROM discounts ORDER BY discount_id DESC').all();
    res.json(discounts);
  } catch (err) {
    next(err);
  }
}

// POST /api/discounts (Admin)
function createDiscount(req, res, next) {
  try {
    const { code, percent, valid_from, valid_to, active } = req.body;
    if (!code || !percent) {
      return res.status(400).json({ error: 'Code and discount percentage are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const result = db.prepare(`
      INSERT INTO discounts (code, percent, valid_from, valid_to, active)
      VALUES (?, ?, ?, ?, ?)
    `).run(cleanCode, percent, valid_from || null, valid_to || null, active !== undefined ? (active ? 1 : 0) : 1);

    const discount = db.prepare('SELECT * FROM discounts WHERE discount_id = ?').get(result.lastInsertRowid);
    res.status(201).json(discount);
  } catch (err) {
    next(err);
  }
}

// PUT /api/discounts/:id (Admin)
function updateDiscount(req, res, next) {
  try {
    const { id } = req.params;
    const { code, percent, valid_from, valid_to, active } = req.body;

    db.prepare(`
      UPDATE discounts
      SET code = ?, percent = ?, valid_from = ?, valid_to = ?, active = ?
      WHERE discount_id = ?
    `).run(code.trim().toUpperCase(), percent, valid_from || null, valid_to || null, active ? 1 : 0, id);

    const updated = db.prepare('SELECT * FROM discounts WHERE discount_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/discounts/:id (Admin)
function deleteDiscount(req, res, next) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM discounts WHERE discount_id = ?').run(id);
    res.json({ message: 'Discount code deleted', id });
  } catch (err) {
    next(err);
  }
}

// POST /api/discounts/validate (Public / Customer)
function validateDiscount(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Promo code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const discount = db.prepare(`
      SELECT * FROM discounts
      WHERE code = ? AND active = 1
        AND (valid_from IS NULL OR valid_from <= date('now'))
        AND (valid_to IS NULL OR valid_to >= date('now'))
    `).get(cleanCode);

    if (!discount) {
      return res.status(400).json({ error: 'Invalid, inactive, or expired promo code.' });
    }

    res.json({
      valid: true,
      code: discount.code,
      percent: discount.percent,
      message: `Promo code applied! Enjoy ${discount.percent}% discount.`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscount
};
