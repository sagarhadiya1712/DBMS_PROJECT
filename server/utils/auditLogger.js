const db = require('../db/db');

/**
 * Records an immutable audit log entry in the audit_logs table.
 * Supports both object parameter ({ user_id, action, table_name, record_id, details })
 * and positional parameters (user_id, action, table_name, record_id, details).
 */
function logAudit(arg1, arg2, arg3, arg4, arg5) {
  try {
    let user_id = null;
    let action = null;
    let table_name = null;
    let record_id = null;
    let details = null;

    if (typeof arg1 === 'object' && arg1 !== null && arg1.action) {
      user_id = arg1.user_id || null;
      action = arg1.action;
      table_name = arg1.table_name || null;
      record_id = arg1.record_id || null;
      details = arg1.details || null;
    } else {
      user_id = arg1 || null;
      action = arg2 || 'ACTION';
      table_name = arg3 || 'general';
      record_id = arg4 || null;
      details = arg5 || null;
    }

    const detailsStr = typeof details === 'object' && details !== null ? JSON.stringify(details) : (details || null);
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(user_id, action, table_name, record_id ? Number(record_id) || null : null, detailsStr);
  } catch (err) {
    console.warn('⚠️ [AuditLog Warning]:', err.message);
  }
}

module.exports = {
  logAudit
};
