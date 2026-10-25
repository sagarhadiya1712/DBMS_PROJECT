/**
 * Real-time Sync Migration Script
 * - Takes a backup of the existing SQLite database
 * - Adds updated_at column to all application tables if not present
 * - Creates db_changes table to track per-table version counter
 * - Creates AFTER INSERT, AFTER UPDATE, AFTER DELETE triggers on each table
 * - Creates row-level touch_updated_at triggers
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

const TABLES = [
  'users',
  'vehicles',
  'vehicle_images',
  'vehicle_documents',
  'bookings',
  'payments',
  'maintenance',
  'fuel_records',
  'drivers',
  'reviews',
  'discounts',
  'kyc_documents',
  'owner_profiles',
  'owner_payouts',
  'email_otps',
  'audit_logs'
];

async function migrate() {
  console.log('🔄 [Realtime Migration] Starting database triggers & db_changes setup...');

  // 1. Database backup
  const dbPath = path.join(__dirname, 'rental.db');
  if (fs.existsSync(dbPath)) {
    const backupPath = path.join(__dirname, `rental.db.bak_${Date.now()}`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`📦 [Realtime Migration] Database backup created at: ${backupPath}`);
  }

  // 2. Ensure db_changes tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_changes (
      table_name TEXT PRIMARY KEY,
      version INTEGER DEFAULT 0,
      changed_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('✅ [Realtime Migration] db_changes tracking table verified.');

  const existingTables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.name);

  // 3. For each table, verify updated_at and build triggers
  for (const table of TABLES) {
    if (!existingTables.includes(table)) {
      console.log(`⏭️ [Realtime Migration] Skipping non-existent table: ${table}`);
      continue;
    }

    // Check updated_at column
    const columns = db.pragma(`table_info(${table})`).map((c) => c.name);
    if (!columns.includes('updated_at')) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT;`);
        db.exec(`UPDATE ${table} SET updated_at = datetime('now') WHERE updated_at IS NULL;`);
        console.log(`  ➕ Added updated_at column to table: ${table}`);
      } catch (err) {
        console.warn(`  ⚠️ Could not add updated_at to ${table}:`, err.message);
      }
    }

    // Initialize row in db_changes
    db.prepare(`
      INSERT OR IGNORE INTO db_changes (table_name, version, changed_at)
      VALUES (?, 0, datetime('now'))
    `).run(table);

    // Drop previous triggers if any to ensure clean idempotent creation
    db.exec(`DROP TRIGGER IF EXISTS trg_${table}_ai;`);
    db.exec(`DROP TRIGGER IF EXISTS trg_${table}_au;`);
    db.exec(`DROP TRIGGER IF EXISTS trg_${table}_ad;`);
    db.exec(`DROP TRIGGER IF EXISTS trg_${table}_touch_updated_at;`);

    // Create AFTER INSERT trigger
    db.exec(`
      CREATE TRIGGER trg_${table}_ai AFTER INSERT ON ${table}
      BEGIN
        UPDATE db_changes
        SET version = version + 1, changed_at = datetime('now')
        WHERE table_name = '${table}';
      END;
    `);

    // Create AFTER UPDATE trigger
    db.exec(`
      CREATE TRIGGER trg_${table}_au AFTER UPDATE ON ${table}
      BEGIN
        UPDATE db_changes
        SET version = version + 1, changed_at = datetime('now')
        WHERE table_name = '${table}';
      END;
    `);

    // Create AFTER DELETE trigger
    db.exec(`
      CREATE TRIGGER trg_${table}_ad AFTER DELETE ON ${table}
      BEGIN
        UPDATE db_changes
        SET version = version + 1, changed_at = datetime('now')
        WHERE table_name = '${table}';
      END;
    `);

    // Row-level updated_at trigger (safe against recursion)
    db.exec(`
      CREATE TRIGGER trg_${table}_touch_updated_at AFTER UPDATE ON ${table}
      WHEN (OLD.updated_at IS NULL OR NEW.updated_at = OLD.updated_at)
      BEGIN
        UPDATE ${table} SET updated_at = datetime('now') WHERE rowid = NEW.rowid;
      END;
    `);

    console.log(`  ⚡ Triggers installed on table: ${table}`);
  }

  // 4. Ensure journal_mode = DELETE in development for immediate lock-free cross-process visibility
  try {
    const journalMode = process.env.NODE_ENV === 'production' ? 'WAL' : 'DELETE';
    db.pragma(`journal_mode = ${journalMode}`);
    console.log(`✅ [Realtime Migration] Journal mode verified: ${journalMode}`);
  } catch (e) {}

  console.log('🎉 [Realtime Migration] Real-time triggers & db_changes migration completed successfully!\n');
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
