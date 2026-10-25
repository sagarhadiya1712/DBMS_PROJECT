const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.resolve(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_FILE || path.join(dbDir, 'rental.db');

const db = new Database(dbPath, {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enforce foreign keys, fast cache, memory temp store, and synchronous mode
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -20000'); // 20 MB cache
db.pragma('temp_store = MEMORY');

// Development uses DELETE mode so changes write immediately to rental.db without WAL delay
// Production can switch to WAL mode for high concurrency
try {
  const journalMode = process.env.NODE_ENV === 'production' ? 'WAL' : 'DELETE';
  db.pragma(`journal_mode = ${journalMode}`);
} catch (e) {
  // If concurrent process holds a lock, continue with current mode
}

// In-memory prepared statement cache
const statementCache = new Map();
db.cachedPrepare = function (sql) {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
};

// Create high-performance indexes on filter and join columns
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_filter ON vehicles(status, category);
    CREATE INDEX IF NOT EXISTS idx_bookings_lookup ON bookings(vehicle_id, start_datetime, end_datetime);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_hold ON bookings(status, hold_expires_at);
  `);
} catch (e) {
  // Table might not be ready yet
}

// Self-healing migration for email_otps table (ensure attempts and created_at columns exist)
try {
  const tableInfo = db.pragma('table_info(email_otps)');
  const columnNames = tableInfo.map((col) => col.name);
  if (!columnNames.includes('attempts')) {
    db.exec('ALTER TABLE email_otps ADD COLUMN attempts INTEGER DEFAULT 0');
  }
  if (!columnNames.includes('created_at')) {
    db.exec("ALTER TABLE email_otps ADD COLUMN created_at DATETIME DEFAULT (datetime('now'))");
  }
} catch (e) {
  // If table doesn't exist yet, it will be created by schema
}

// Self-healing migration for users table (ensure last_login column exists)
try {
  const userTableInfo = db.pragma('table_info(users)');
  const userCols = userTableInfo.map((col) => col.name);
  if (!userCols.includes('last_login')) {
    db.exec('ALTER TABLE users ADD COLUMN last_login DATETIME');
  }
} catch (e) {
  // Table created by schema
}

module.exports = db;
