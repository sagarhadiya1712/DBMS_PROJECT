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

// Enforce foreign keys and live disk write mode for VS Code SQLite viewer
db.pragma('foreign_keys = ON');

// Development uses DELETE mode so changes write immediately to rental.db without WAL delay
// Production can switch to WAL mode for high concurrency
try {
  const journalMode = process.env.NODE_ENV === 'production' ? 'WAL' : 'DELETE';
  db.pragma(`journal_mode = ${journalMode}`);
} catch (e) {
  // If concurrent process holds a lock, continue with current mode
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

module.exports = db;
