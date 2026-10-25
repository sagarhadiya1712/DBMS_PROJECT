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

    // Ensure last_login column exists in Oracle users table
    try {
      await conn.execute('ALTER TABLE users ADD (last_login TIMESTAMP)');
    } catch (err) {
      // ORA-01430: column being added already exists in table
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
      const parsedLastLogin = u.last_login ? new Date(u.last_login) : null;
      await executeOracle(
        `MERGE INTO users t
         USING (SELECT :email AS email FROM dual) s
         ON (t.email = s.email)
         WHEN MATCHED THEN
           UPDATE SET t.name = :name, t.phone = :phone, t.password_hash = :password_hash,
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

      if (parsedLastLogin && !isNaN(parsedLastLogin.getTime())) {
        await executeOracle(
          `UPDATE users SET last_login = :last_login WHERE LOWER(email) = LOWER(:email)`,
          {
            last_login: parsedLastLogin,
            email: u.email
          }
        );
      }
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

/**
 * Update user last_login in Oracle on successful login
 */
async function recordUserLogin(email) {
  if (!email) return;
  try {
    await executeOracle(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE LOWER(email) = LOWER(:email)`,
      { email: email.trim() }
    );
  } catch (err) {
    console.error('⚠️ [Oracle Login Update Error]:', err.message);
  }
}

/**
 * Sync changes from Oracle to SQLite
 */
async function syncOracleToSqlite(sqliteDb) {
  try {
    const res = await executeOracle(
      `SELECT vehicle_id, name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url FROM vehicles ORDER BY vehicle_id`
    );
    if (!res || !res.rows) return 0;

    let updatedCount = 0;
    const stmtCheck = sqliteDb.prepare('SELECT vehicle_id, name, security_deposit, price_per_day, status FROM vehicles WHERE vehicle_id = ?');
    const stmtUpdate = sqliteDb.prepare(`
      UPDATE vehicles SET
        name = ?,
        brand = ?,
        category = ?,
        fuel_type = ?,
        transmission = ?,
        seats = ?,
        price_per_day = ?,
        price_per_hour = ?,
        price_per_km = ?,
        security_deposit = ?,
        status = ?,
        image_url = COALESCE(?, image_url),
        updated_at = datetime('now')
      WHERE vehicle_id = ?
    `);

    for (const [vId, name, brand, category, fuel, trans, seats, priceDay, priceHour, priceKm, secDeposit, status, img] of res.rows) {
      const existing = stmtCheck.get(vId);
      if (existing) {
        if (
          existing.name !== name ||
          existing.security_deposit !== secDeposit ||
          existing.price_per_day !== priceDay ||
          existing.status !== status
        ) {
          stmtUpdate.run(
            name, brand, category, fuel, trans, seats,
            priceDay, priceHour, priceKm, secDeposit, status, img,
            vId
          );
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`⚡ [Oracle -> SQLite Sync] Synchronized ${updatedCount} updated vehicles into SQLite!`);
      // Update SQLite db_changes
      sqliteDb.prepare(`
        INSERT INTO db_changes (table_name, version, changed_at)
        VALUES ('vehicles', 1, datetime('now'))
        ON CONFLICT(table_name) DO UPDATE SET
          version = db_changes.version + 1,
          changed_at = datetime('now')
      `).run();
    }
    return updatedCount;
  } catch (err) {
    console.error('⚠️ [Oracle -> SQLite Sync Error]:', err.message);
    return 0;
  }
}

module.exports = {
  getOraclePool,
  executeOracle,
  initOracleSchema,
  syncSqliteToOracle,
  syncOracleToSqlite,
  syncUserToOracle,
  recordUserLogin,
};

