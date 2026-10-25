require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

let pool = null;

async function getOraclePool() {
  if (pool) return pool;

  const user = process.env.ORACLE_USER;
  const password = process.env.ORACLE_PASSWORD;
  const connectString = process.env.ORACLE_CONNECT_STRING || 'localhost:1521/FREEPDB1';

  if (!user || !password) {
    return null;
  }

  try {
    pool = await oracledb.createPool({
      user,
      password,
      connectString,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
    });
    console.log('✅ [Oracle DB] Connection pool established to:', connectString);
    return pool;
  } catch (err) {
    console.warn('⚠️ [Oracle DB] Could not connect to Oracle:', err.message);
    return null;
  }
}

/**
 * Execute query on Oracle database safely
 */
async function executeOracle(sql, binds = [], opts = {}) {
  try {
    const p = await getOraclePool();
    if (!p) return null;
    const conn = await p.getConnection();
    try {
      const result = await conn.execute(sql, binds, { autoCommit: true, ...opts });
      return result;
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error('⚠️ [Oracle DB Exec Error]:', err.message);
    return null;
  }
}

/**
 * Initialize Oracle Schema from schema_oracle.sql
 */
async function initOracleSchema() {
  const p = await getOraclePool();
  if (!p) return;

  const schemaPath = path.join(__dirname, 'schema_oracle.sql');
  if (!fs.existsSync(schemaPath)) return;

  const content = fs.readFileSync(schemaPath, 'utf8');
  // Split on ';' or '/'
  const statements = content
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  const conn = await p.getConnection();
  try {
    for (const stmt of statements) {
      // Clean comment lines
      const cleanStmt = stmt
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim();

      if (!cleanStmt) continue;

      try {
        await conn.execute(cleanStmt);
      } catch (err) {
        // Ignore "name is already used by an existing object" (ORA-00955)
        if (err.errorNum === 955) {
          // Table already exists
        } else {
          // console.log(`Notice on stmt: ${err.message}`);
        }
      }
    }
    console.log('✅ [Oracle DB] Schema initialized/verified in Oracle Free (DBMS_PROJ).');
  } finally {
    await conn.close();
  }
}

/**
 * Sync all SQLite tables to Oracle Database
 */
async function syncSqliteToOracle(sqliteDb) {
  const p = await getOraclePool();
  if (!p) return;

  try {
    // 1. Sync Users
    const users = sqliteDb.prepare('SELECT * FROM users').all();
    for (const u of users) {
      await executeOracle(
        `MERGE INTO users t
         USING (SELECT :user_id AS user_id, :name AS name, :phone AS phone, :email AS email,
                       :password_hash AS password_hash, :role AS role, :is_verified AS is_verified,
                       :is_blocked AS is_blocked, :google_id AS google_id FROM dual) s
         ON (t.email = s.email)
         WHEN MATCHED THEN
           UPDATE SET t.name = s.name, t.phone = s.phone, t.password_hash = s.password_hash,
                      t.role = s.role, t.is_verified = s.is_verified, t.is_blocked = s.is_blocked,
                      t.google_id = s.google_id
         WHEN NOT MATCHED THEN
           INSERT (name, phone, email, password_hash, role, is_verified, is_blocked, google_id)
           VALUES (s.name, s.phone, s.email, s.password_hash, s.role, s.is_verified, s.is_blocked, s.google_id)`,
        {
          user_id: u.user_id,
          name: u.name,
          phone: u.phone || null,
          email: u.email,
          password_hash: u.password_hash || null,
          role: u.role || 'customer',
          is_verified: u.is_verified ? 1 : 0,
          is_blocked: u.is_blocked ? 1 : 0,
          google_id: u.google_id || null,
        }
      );
    }

    // 2. Sync Vehicles
    const vehicles = sqliteDb.prepare('SELECT * FROM vehicles').all();
    for (const v of vehicles) {
      await executeOracle(
        `MERGE INTO vehicles t
         USING (SELECT :name AS name, :brand AS brand FROM dual) s
         ON (t.name = s.name AND t.brand = s.brand)
         WHEN MATCHED THEN
           UPDATE SET t.category = :category, t.fuel_type = :fuel_type, t.transmission = :transmission,
                      t.seats = :seats, t.price_per_day = :price_per_day, t.price_per_hour = :price_per_hour,
                      t.price_per_km = :price_per_km, t.security_deposit = :security_deposit,
                      t.status = :status, t.image_url = :image_url
         WHEN NOT MATCHED THEN
           INSERT (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url)
           VALUES (:category_in, :brand_in, :category_val, :fuel_type_val, :transmission_val, :seats_val, :price_day_val, :price_hour_val, :price_km_val, :sec_dep_val, :status_val, :img_url_val)`,
        {
          name: v.name,
          brand: v.brand,
          category: v.category,
          fuel_type: v.fuel_type,
          transmission: v.transmission,
          seats: v.seats,
          price_per_day: v.price_per_day,
          price_per_hour: v.price_per_hour,
          price_per_km: v.price_per_km,
          security_deposit: v.security_deposit,
          status: v.status,
          image_url: v.image_url || null,
          category_in: v.name,
          brand_in: v.brand,
          category_val: v.category,
          fuel_type_val: v.fuel_type,
          transmission_val: v.transmission,
          seats_val: v.seats,
          price_day_val: v.price_per_day,
          price_hour_val: v.price_per_hour,
          price_km_val: v.price_per_km,
          sec_dep_val: v.security_deposit,
          status_val: v.status,
          img_url_val: v.image_url || null,
        }
      );
    }

    console.log(`✅ [Oracle DB] Live sync completed: ${users.length} users and ${vehicles.length} vehicles synchronized to Oracle (DBMS_PROJ).`);
  } catch (err) {
    console.error('⚠️ [Oracle Sync Error]:', err.message);
  }
}

/**
 * Real-time sync for single user
 */
async function syncUserToOracle(u) {
  if (!u || !u.email) return;
  try {
    await executeOracle(
      `MERGE INTO users t
       USING (SELECT :email AS email FROM dual) s
       ON (t.email = s.email)
       WHEN MATCHED THEN
         UPDATE SET t.name = :name, t.phone = :phone,
                    t.role = :role, t.is_verified = :is_verified, t.is_blocked = :is_blocked,
                    t.google_id = :google_id
       WHEN NOT MATCHED THEN
         INSERT (name, phone, email, password_hash, role, is_verified, is_blocked, google_id)
         VALUES (:name, :phone, :email, :password_hash, :role, :is_verified, :is_blocked, :google_id)`,
      {
        name: u.name,
        phone: u.phone || null,
        email: u.email,
        password_hash: u.password_hash || null,
        role: u.role || 'customer',
        is_verified: u.is_verified ? 1 : 0,
        is_blocked: u.is_blocked ? 1 : 0,
        google_id: u.google_id || null,
      }
    );
  } catch (err) {
    console.error('⚠️ [Oracle Live User Sync Error]:', err.message);
  }
}

module.exports = {
  getOraclePool,
  executeOracle,
  initOracleSchema,
  syncSqliteToOracle,
  syncUserToOracle,
};
