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

// Enforce foreign keys and modern WAL mode for performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = db;
