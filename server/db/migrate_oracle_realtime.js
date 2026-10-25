const { getOraclePool, executeOracle } = require('./oracle');

async function migrateOracleRealtime() {
  console.log('🔄 [Oracle Migration] Setting up real-time DB_CHANGES table and triggers...');
  const pool = await getOraclePool();
  if (!pool) {
    console.warn('⚠️ [Oracle Migration] Oracle pool not available, skipping.');
    return;
  }

  const conn = await pool.getConnection();
  try {
    // 1. Create DB_CHANGES table if not exists
    try {
      await conn.execute(`
        CREATE TABLE db_changes (
          table_name VARCHAR2(50) PRIMARY KEY,
          version NUMBER DEFAULT 0,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created DB_CHANGES table in Oracle');
    } catch (e) {
      if (e.errorNum === 955) {
        console.log('ℹ️ DB_CHANGES table already exists in Oracle');
      } else {
        console.error('Error creating DB_CHANGES:', e.message);
      }
    }

    // 2. Initialize rows in DB_CHANGES
    const tables = [
      'users', 'vehicles', 'vehicle_images', 'vehicle_documents',
      'bookings', 'payments', 'maintenance', 'fuel_records',
      'drivers', 'reviews', 'discounts', 'kyc_documents',
      'owner_profiles', 'owner_payouts'
    ];

    for (const tbl of tables) {
      try {
        await conn.execute(`
          MERGE INTO db_changes t
          USING (SELECT :tname AS table_name FROM dual) s
          ON (t.table_name = s.table_name)
          WHEN NOT MATCHED THEN
            INSERT (table_name, version, changed_at)
            VALUES (:tname, 1, CURRENT_TIMESTAMP)
        `, { tname: tbl }, { autoCommit: true });
      } catch (e) {}
    }

    // 3. Create triggers on key tables
    // A. VEHICLES Trigger
    try {
      await conn.execute(`
        CREATE OR REPLACE TRIGGER trg_vehicles_changes
        AFTER INSERT OR UPDATE OR DELETE ON vehicles
        BEGIN
          MERGE INTO db_changes t
          USING (SELECT 'vehicles' AS table_name FROM dual) s
          ON (t.table_name = s.table_name)
          WHEN MATCHED THEN
            UPDATE SET t.version = t.version + 1, t.changed_at = CURRENT_TIMESTAMP
          WHEN NOT MATCHED THEN
            INSERT (table_name, version, changed_at) VALUES ('vehicles', 1, CURRENT_TIMESTAMP);
        END;
      `);
      console.log('✅ Created trg_vehicles_changes in Oracle');
    } catch (e) {
      console.error('Error creating vehicles trigger in Oracle:', e.message);
    }

    // B. BOOKINGS Trigger
    try {
      await conn.execute(`
        CREATE OR REPLACE TRIGGER trg_bookings_changes
        AFTER INSERT OR UPDATE OR DELETE ON bookings
        BEGIN
          MERGE INTO db_changes t
          USING (SELECT 'bookings' AS table_name FROM dual) s
          ON (t.table_name = s.table_name)
          WHEN MATCHED THEN
            UPDATE SET t.version = t.version + 1, t.changed_at = CURRENT_TIMESTAMP
          WHEN NOT MATCHED THEN
            INSERT (table_name, version, changed_at) VALUES ('bookings', 1, CURRENT_TIMESTAMP);
        END;
      `);
      console.log('✅ Created trg_bookings_changes in Oracle');
    } catch (e) {
      console.error('Error creating bookings trigger in Oracle:', e.message);
    }

    // C. USERS Trigger
    try {
      await conn.execute(`
        CREATE OR REPLACE TRIGGER trg_users_changes
        AFTER INSERT OR UPDATE OR DELETE ON users
        BEGIN
          MERGE INTO db_changes t
          USING (SELECT 'users' AS table_name FROM dual) s
          ON (t.table_name = s.table_name)
          WHEN MATCHED THEN
            UPDATE SET t.version = t.version + 1, t.changed_at = CURRENT_TIMESTAMP
          WHEN NOT MATCHED THEN
            INSERT (table_name, version, changed_at) VALUES ('users', 1, CURRENT_TIMESTAMP);
        END;
      `);
      console.log('✅ Created trg_users_changes in Oracle');
    } catch (e) {
      console.error('Error creating users trigger in Oracle:', e.message);
    }

    // D. PAYMENTS Trigger
    try {
      await conn.execute(`
        CREATE OR REPLACE TRIGGER trg_payments_changes
        AFTER INSERT OR UPDATE OR DELETE ON payments
        BEGIN
          MERGE INTO db_changes t
          USING (SELECT 'payments' AS table_name FROM dual) s
          ON (t.table_name = s.table_name)
          WHEN MATCHED THEN
            UPDATE SET t.version = t.version + 1, t.changed_at = CURRENT_TIMESTAMP
          WHEN NOT MATCHED THEN
            INSERT (table_name, version, changed_at) VALUES ('payments', 1, CURRENT_TIMESTAMP);
        END;
      `);
      console.log('✅ Created trg_payments_changes in Oracle');
    } catch (e) {
      console.error('Error creating payments trigger in Oracle:', e.message);
    }

    console.log('🎉 [Oracle Migration] Real-time setup complete in Oracle (DBMS_PROJ)!');
  } finally {
    await conn.close();
  }
}

if (require.main === module) {
  migrateOracleRealtime().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { migrateOracleRealtime };
