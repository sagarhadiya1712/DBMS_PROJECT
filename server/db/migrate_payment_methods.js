const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function migrate() {
  const dbPath = path.join(__dirname, 'rental.db');
  const backupPath = path.join(__dirname, 'rental.backup.db');

  console.log('🚀 Starting payment methods database migration...');

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file rental.db does not exist at:', dbPath);
    return;
  }

  // 1. Create a safe backup before altering any schema
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Backup successfully created at: ${backupPath}`);

  const db = new Database(dbPath);

  // Turn off foreign keys temporarily for atomic table swap
  db.pragma('foreign_keys = OFF');

  const beforeCounts = {
    users: db.prepare('SELECT count(*) as c FROM users').get().c,
    vehicles: db.prepare('SELECT count(*) as c FROM vehicles').get().c,
    bookings: db.prepare('SELECT count(*) as c FROM bookings').get().c,
    payments: db.prepare('SELECT count(*) as c FROM payments').get().c,
    otps: db.prepare('SELECT count(*) as c FROM email_otps').get().c,
  };

  console.log('📊 Pre-migration row counts:', beforeCounts);

  const migrationTx = db.transaction(() => {
    // 2. Inspect existing columns in bookings
    const bookingsCols = db.pragma('table_info(bookings)').map((c) => c.name);
    const hasPaymentMethod = bookingsCols.includes('payment_method');
    const hasHoldExpiresAt = bookingsCols.includes('hold_expires_at');

    // 3. Create bookings_new table with updated CHECK constraints & new columns
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings_new (
        booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        start_datetime DATETIME NOT NULL,
        end_datetime DATETIME NOT NULL,
        pricing_type TEXT CHECK(pricing_type IN ('day', 'hour', 'km')) DEFAULT 'day',
        total_amount REAL NOT NULL,
        deposit_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        late_fee REAL DEFAULT 0,
        status TEXT CHECK(status IN ('Awaiting Payment', 'Confirmed', 'Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Cancelled')) DEFAULT 'Awaiting Payment',
        payment_method TEXT NOT NULL DEFAULT 'ONLINE' CHECK (payment_method IN ('ONLINE', 'COD')),
        hold_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Copy data from old bookings to bookings_new
    const oldMethodExpr = hasPaymentMethod ? "COALESCE(payment_method, 'ONLINE')" : "'ONLINE'";
    const oldHoldExpr = hasHoldExpiresAt ? "hold_expires_at" : "NULL";

    db.exec(`
      INSERT INTO bookings_new (
        booking_id, user_id, vehicle_id, start_datetime, end_datetime,
        pricing_type, total_amount, deposit_amount, discount_amount, late_fee,
        status, payment_method, hold_expires_at, created_at
      )
      SELECT
        booking_id, user_id, vehicle_id, start_datetime, end_datetime,
        pricing_type, total_amount, deposit_amount, discount_amount, late_fee,
        CASE WHEN status = 'Approved' THEN 'Confirmed' ELSE status END,
        ${oldMethodExpr},
        ${oldHoldExpr},
        created_at
      FROM bookings;
    `);

    // 4. Inspect existing columns in payments
    const paymentsCols = db.pragma('table_info(payments)').map((c) => c.name);
    const hasCollectedBy = paymentsCols.includes('collected_by');

    // Create payments_new table with updated method CHECK constraint & collected_by
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments_new (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        method TEXT CHECK(method IN ('UPI', 'Card', 'NetBanking', 'Wallet', 'COD', 'Razorpay')) DEFAULT 'Card',
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        payment_status TEXT CHECK(payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')) DEFAULT 'Pending',
        paid_at DATETIME,
        collected_by INTEGER REFERENCES users(user_id)
      );
    `);

    const oldCollectedExpr = hasCollectedBy ? "collected_by" : "NULL";

    db.exec(`
      INSERT INTO payments_new (
        payment_id, booking_id, amount, method,
        razorpay_order_id, razorpay_payment_id, payment_status, paid_at, collected_by
      )
      SELECT
        payment_id, booking_id, amount,
        CASE
          WHEN method IN ('UPI', 'Card', 'NetBanking', 'Wallet', 'COD', 'Razorpay') THEN method
          ELSE 'Card'
        END,
        razorpay_order_id, razorpay_payment_id,
        payment_status, paid_at, ${oldCollectedExpr}
      FROM payments;
    `);

    // 5. Swap tables atomically
    db.exec(`
      DROP TABLE bookings;
      ALTER TABLE bookings_new RENAME TO bookings;

      DROP TABLE payments;
      ALTER TABLE payments_new RENAME TO payments;
    `);

    // 6. Create performance index
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bookings_status_hold ON bookings(status, hold_expires_at);
      CREATE INDEX IF NOT EXISTS idx_bookings_user_cod ON bookings(user_id, payment_method, status);
      CREATE INDEX IF NOT EXISTS idx_payments_method_status ON payments(method, payment_status);
    `);
  });

  migrationTx();

  // Re-enable foreign keys and verify integrity
  db.pragma('foreign_keys = ON');
  const fkCheck = db.pragma('foreign_key_check');
  if (fkCheck.length > 0) {
    console.warn('⚠️ Foreign key warning:', fkCheck);
  }

  const afterCounts = {
    users: db.prepare('SELECT count(*) as c FROM users').get().c,
    vehicles: db.prepare('SELECT count(*) as c FROM vehicles').get().c,
    bookings: db.prepare('SELECT count(*) as c FROM bookings').get().c,
    payments: db.prepare('SELECT count(*) as c FROM payments').get().c,
    otps: db.prepare('SELECT count(*) as c FROM email_otps').get().c,
  };

  console.log('📊 Post-migration row counts:', afterCounts);

  // Validate integrity
  if (
    beforeCounts.bookings === afterCounts.bookings &&
    beforeCounts.payments === afterCounts.payments &&
    beforeCounts.users === afterCounts.users
  ) {
    console.log('✅ Migration completed successfully with ZERO data loss!');
  } else {
    throw new Error('❌ Data count mismatch! Restoring backup recommended.');
  }

  db.close();
}

if (require.main === module) {
  try {
    migrate();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

module.exports = migrate;
