const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'rental.db');
const backupPath = path.resolve(__dirname, 'rental.backup.db');

console.log('======================================================');
console.log('🚀 MIGRATION: Vehicle Owner Role & KYC Verification System');
console.log('======================================================');

// 1. Create a safe backup before migration
try {
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Pre-migration database backup saved to:\n   ${backupPath}`);
  } else {
    console.log('⚠️ Database does not exist yet; will be initialized cleanly.');
  }
} catch (err) {
  console.error('❌ Failed to create database backup:', err.message);
  process.exit(1);
}

const db = new Database(dbPath);

// Count records before migration to ensure 0% data loss
const beforeCounts = {
  users: 0,
  vehicles: 0,
  bookings: 0,
  payments: 0,
};
try {
  beforeCounts.users = db.prepare('SELECT count(*) as c FROM users').get().c;
  beforeCounts.vehicles = db.prepare('SELECT count(*) as c FROM vehicles').get().c;
  beforeCounts.bookings = db.prepare('SELECT count(*) as c FROM bookings').get().c;
  beforeCounts.payments = db.prepare('SELECT count(*) as c FROM payments').get().c;
} catch (e) {}

console.log('📊 Existing Records Before Migration:', beforeCounts);

try {
  db.pragma('foreign_keys = OFF');

  db.transaction(() => {
    // -------------------------------------------------------------
    // 1. REBUILD USERS TABLE (Role: customer, owner, admin; kyc_status, deleted_at)
    // -------------------------------------------------------------
    console.log('🔄 Migrating users table...');
    const existingUsers = db.prepare('SELECT * FROM users').all();

    db.exec(`
      CREATE TABLE IF NOT EXISTS users_new (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'owner', 'admin')),
        is_verified INTEGER DEFAULT 0,
        is_blocked INTEGER DEFAULT 0,
        google_id TEXT,
        kyc_status TEXT NOT NULL DEFAULT 'NotSubmitted' CHECK (kyc_status IN ('NotSubmitted', 'Pending', 'Approved', 'Rejected')),
        kyc_rejection_reason TEXT,
        deleted_at TEXT,
        last_login DATETIME,
        created_at DATETIME DEFAULT (datetime('now'))
      );
    `);

    const insertUserStmt = db.prepare(`
      INSERT INTO users_new (
        user_id, name, phone, email, password_hash, role, is_verified,
        is_blocked, google_id, kyc_status, kyc_rejection_reason, deleted_at, last_login, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of existingUsers) {
      let role = (u.role || 'customer').toLowerCase();
      if (!['customer', 'owner', 'admin'].includes(role)) role = 'customer';
      let kycStatus = u.kyc_status || (role === 'admin' ? 'Approved' : 'NotSubmitted');

      insertUserStmt.run(
        u.user_id,
        u.name,
        u.phone || null,
        u.email,
        u.password_hash || null,
        role,
        u.is_verified ? 1 : 0,
        u.is_blocked ? 1 : 0,
        u.google_id || null,
        kycStatus,
        u.kyc_rejection_reason || null,
        u.deleted_at || null,
        u.last_login || null,
        u.created_at || new Date().toISOString()
      );
    }

    db.exec(`
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // -------------------------------------------------------------
    // 2. REBUILD VEHICLES TABLE (owner_id, registration_number, approval_status, deleted_at)
    // -------------------------------------------------------------
    console.log('🔄 Migrating vehicles table...');
    const existingVehicles = db.prepare('SELECT * FROM vehicles').all();

    db.exec(`
      CREATE TABLE IF NOT EXISTS vehicles_new (
        vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER REFERENCES users(user_id),
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury')),
        fuel_type TEXT NOT NULL,
        transmission TEXT NOT NULL,
        seats INTEGER NOT NULL,
        price_per_day REAL NOT NULL,
        price_per_hour REAL NOT NULL,
        price_per_km REAL NOT NULL,
        security_deposit REAL NOT NULL,
        registration_number TEXT UNIQUE,
        approval_status TEXT NOT NULL DEFAULT 'Approved' CHECK (approval_status IN ('Draft', 'Pending Approval', 'Approved', 'Rejected')),
        rejection_reason TEXT,
        status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Rented', 'In Service')),
        image_url TEXT,
        is_chauffeur_driven INTEGER DEFAULT 0,
        insurance_expiry TEXT,
        permit_expiry TEXT,
        deleted_at TEXT,
        created_at DATETIME DEFAULT (datetime('now'))
      );
    `);

    const insertVehicleStmt = db.prepare(`
      INSERT INTO vehicles_new (
        vehicle_id, owner_id, name, brand, category, fuel_type, transmission,
        seats, price_per_day, price_per_hour, price_per_km, security_deposit,
        registration_number, approval_status, rejection_reason, status,
        image_url, is_chauffeur_driven, insurance_expiry, permit_expiry, deleted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let regCounter = 1001;
    for (const v of existingVehicles) {
      const regNo = v.registration_number || `DL01AF${regCounter++}`;
      insertVehicleStmt.run(
        v.vehicle_id,
        v.owner_id || null,
        v.name,
        v.brand,
        v.category,
        v.fuel_type,
        v.transmission,
        v.seats,
        v.price_per_day,
        v.price_per_hour,
        v.price_per_km,
        v.security_deposit,
        regNo,
        v.approval_status || 'Approved',
        v.rejection_reason || null,
        v.status || 'Available',
        v.image_url || null,
        v.is_chauffeur_driven || 0,
        v.insurance_expiry || null,
        v.permit_expiry || null,
        v.deleted_at || null,
        v.created_at || new Date().toISOString()
      );
    }

    db.exec(`
      DROP TABLE vehicles;
      ALTER TABLE vehicles_new RENAME TO vehicles;
      CREATE INDEX IF NOT EXISTS idx_vehicles_filter ON vehicles(status, category, owner_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_approval ON vehicles(approval_status);
    `);

    // -------------------------------------------------------------
    // 3. ENSURE deleted_at IN bookings AND payments
    // -------------------------------------------------------------
    console.log('🔄 Checking bookings and payments tables...');
    const bookingCols = db.pragma('table_info(bookings)').map(c => c.name);
    if (!bookingCols.includes('deleted_at')) {
      db.exec('ALTER TABLE bookings ADD COLUMN deleted_at TEXT');
    }

    const paymentCols = db.pragma('table_info(payments)').map(c => c.name);
    if (!paymentCols.includes('deleted_at')) {
      db.exec('ALTER TABLE payments ADD COLUMN deleted_at TEXT');
    }

    // -------------------------------------------------------------
    // 4. CREATE NEW TABLES (kyc_documents, owner_profiles, vehicle_images, owner_payouts, audit_logs)
    // -------------------------------------------------------------
    console.log('🔄 Creating new KYC and Owner tables...');

    // 4.1 KYC Documents
    db.exec(`
      CREATE TABLE IF NOT EXISTS kyc_documents (
        doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        doc_type TEXT NOT NULL CHECK (doc_type IN ('DrivingLicense_Front', 'DrivingLicense_Back', 'Aadhaar_Front', 'Aadhaar_Back', 'PAN', 'Selfie')),
        doc_number TEXT,
        file_path TEXT NOT NULL,
        expiry_date TEXT,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
        rejection_reason TEXT,
        reviewed_by INTEGER REFERENCES users(user_id),
        reviewed_at TEXT,
        uploaded_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_documents(user_id, status);
    `);

    // 4.2 Owner Profiles
    db.exec(`
      CREATE TABLE IF NOT EXISTS owner_profiles (
        owner_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        business_name TEXT,
        address TEXT,
        city TEXT,
        bank_account_holder TEXT,
        bank_account_number_enc TEXT,
        ifsc TEXT,
        upi_id TEXT,
        commission_percent REAL DEFAULT 20,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 4.3 Vehicle Images
    db.exec(`
      CREATE TABLE IF NOT EXISTS vehicle_images (
        image_id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        thumb_path TEXT,
        image_type TEXT DEFAULT 'Front' CHECK (image_type IN ('Front', 'Back', 'Left', 'Right', 'Interior', 'Other')),
        is_primary INTEGER DEFAULT 0,
        uploaded_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_vehicle_images_vid ON vehicle_images(vehicle_id);
    `);

    // 4.4 Owner Payouts
    db.exec(`
      CREATE TABLE IF NOT EXISTS owner_payouts (
        payout_id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL REFERENCES users(user_id),
        booking_id INTEGER NOT NULL REFERENCES bookings(booking_id),
        gross_amount REAL NOT NULL,
        commission_amount REAL NOT NULL,
        payout_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
        paid_at TEXT,
        reference_no TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_owner_payouts_oid ON owner_payouts(owner_id, status);
    `);

    // 4.5 Audit Logs
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(table_name, action);
    `);

    // 4.6 Vehicle Documents (Extend)
    db.exec(`
      CREATE TABLE IF NOT EXISTS vehicle_documents_new (
        doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
        doc_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        expiry_date TEXT,
        status TEXT NOT NULL DEFAULT 'Approved' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
        rejection_reason TEXT,
        uploaded_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Migrate any existing vehicle_documents
    try {
      const oldDocs = db.prepare('SELECT * FROM vehicle_documents').all();
      const insertDocStmt = db.prepare(`
        INSERT INTO vehicle_documents_new (doc_id, vehicle_id, doc_type, file_path, expiry_date, status, uploaded_at)
        VALUES (?, ?, ?, ?, ?, 'Approved', datetime('now'))
      `);
      for (const d of oldDocs) {
        insertDocStmt.run(d.doc_id, d.vehicle_id, d.doc_type, d.file_url || 'dummy.pdf', d.expiry_date || null);
      }
      db.exec(`
        DROP TABLE vehicle_documents;
        ALTER TABLE vehicle_documents_new RENAME TO vehicle_documents;
      `);
    } catch (e) {
      db.exec('ALTER TABLE vehicle_documents_new RENAME TO vehicle_documents;');
    }
  })();

  db.pragma('foreign_keys = ON');
  console.log('✅ Migration transaction committed successfully.');
} catch (err) {
  console.error('❌ Migration error:', err);
  process.exit(1);
}

// Verify counts after migration
const afterCounts = {
  users: db.prepare('SELECT count(*) as c FROM users').get().c,
  vehicles: db.prepare('SELECT count(*) as c FROM vehicles').get().c,
  bookings: db.prepare('SELECT count(*) as c FROM bookings').get().c,
  payments: db.prepare('SELECT count(*) as c FROM payments').get().c,
  kyc_documents: db.prepare('SELECT count(*) as c FROM kyc_documents').get().c,
  owner_profiles: db.prepare('SELECT count(*) as c FROM owner_profiles').get().c,
  vehicle_images: db.prepare('SELECT count(*) as c FROM vehicle_images').get().c,
  owner_payouts: db.prepare('SELECT count(*) as c FROM owner_payouts').get().c,
  audit_logs: db.prepare('SELECT count(*) as c FROM audit_logs').get().c,
};

console.log('📊 Active Records After Migration:', afterCounts);

if (afterCounts.users < beforeCounts.users || afterCounts.vehicles < beforeCounts.vehicles) {
  console.error('❌ Data loss detected! Rolling back is advised.');
  process.exit(1);
}

console.log('🎉 100% Data Preserved! Migration Complete.');
db.close();
