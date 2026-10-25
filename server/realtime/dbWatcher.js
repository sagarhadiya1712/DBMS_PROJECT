const EventEmitter = require('events');
const path = require('path');

class DBWatcher extends EventEmitter {
  constructor() {
    super();
    this.intervalMs = parseInt(process.env.WATCH_INTERVAL_MS || '1000', 10);
    this.timer = null;
    this.isPolling = false;

    // In-memory cache of table versions
    this.sqliteVersions = new Map();
    this.oracleVersions = new Map();
    this.lastOracleChecksum = null;

    console.log(`🔍 [DB Watcher] Dual Real-Time Sync initialized (watching SQLite & Oracle).`);
  }

  /**
   * Start polling for database commits & changes
   */
  start() {
    if (this.timer) return;

    // Initial snapshot of versions
    this.checkChanges(true).catch(() => {});

    this.timer = setInterval(() => {
      this.checkChanges(false).catch((err) => {
        if (err.code !== 'SQLITE_BUSY' && err.code !== 'SQLITE_LOCKED') {
          console.warn('⚠️ [DB Watcher Warning]:', err.message);
        }
      });
    }, this.intervalMs);

    console.log(`⏱️ [DB Watcher] Active. Dual polling interval: ${this.intervalMs}ms`);
  }

  /**
   * Stop watcher
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 [DB Watcher] Polling stopped.');
    }
  }

  /**
   * Check both SQLite and Oracle for updates
   */
  async checkChanges(isInitial = false) {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // 1. Poll SQLite
      await this.pollSQLite(isInitial);
      // 2. Poll Oracle (so direct edits in SQL Developer are caught live)
      await this.pollOracle(isInitial);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * SQLite polling logic:
   * Directly inspects db_changes table (takes ~0.04ms).
   */
  async pollSQLite(isInitial = false) {
    const db = require('../db/db');

    let rows = [];
    try {
      rows = db.prepare('SELECT table_name, version, changed_at FROM db_changes').all();
    } catch (e) {
      // Database momentarily locked during write
      return;
    }

    const changedTables = [];

    for (const row of rows) {
      const prevVersion = this.sqliteVersions.get(row.table_name);
      if (prevVersion === undefined) {
        this.sqliteVersions.set(row.table_name, row.version);
      } else if (row.version > prevVersion) {
        changedTables.push(row.table_name);
        this.sqliteVersions.set(row.table_name, row.version);
      }
    }

    if (!isInitial && changedTables.length > 0) {
      console.log(`⚡ [SQLite Change Detected] Tables: [${changedTables.join(', ')}]`);
      this.emit('change', {
        tables: changedTables,
        timestamp: new Date().toISOString(),
        source: 'sqlite'
      });
    }
  }

  /**
   * Oracle polling logic:
   * Detects manual edits / COMMITs in Oracle SQL Developer / PL/SQL.
   */
  async pollOracle(isInitial = false) {
    try {
      const { executeOracle, syncOracleToSqlite } = require('../db/oracle');
      const sqliteDb = require('../db/db');

      // Check 1: Oracle db_changes table
      let changedFromTriggers = [];
      const result = await executeOracle('SELECT table_name, version FROM db_changes');
      if (result && result.rows) {
        for (const [tableName, version] of result.rows) {
          const prevVersion = this.oracleVersions.get(tableName);
          if (prevVersion === undefined) {
            this.oracleVersions.set(tableName, version);
          } else if (version > prevVersion) {
            changedFromTriggers.push(tableName.toLowerCase());
            this.oracleVersions.set(tableName, version);
          }
        }
      }

      // Check 2: Fail-safe vehicles checksum (catches direct table edits immediately)
      let checksumChanged = false;
      const chkRes = await executeOracle(
        'SELECT COUNT(*), NVL(SUM(security_deposit), 0), NVL(SUM(price_per_day), 0) FROM vehicles'
      );
      if (chkRes && chkRes.rows && chkRes.rows.length > 0) {
        const [cnt, sumDep, sumPrice] = chkRes.rows[0];
        const currentChecksum = `${cnt}_${sumDep}_${sumPrice}`;
        if (this.lastOracleChecksum === null) {
          this.lastOracleChecksum = currentChecksum;
        } else if (this.lastOracleChecksum !== currentChecksum) {
          checksumChanged = true;
          this.lastOracleChecksum = currentChecksum;
          if (!changedFromTriggers.includes('vehicles')) {
            changedFromTriggers.push('vehicles');
          }
        }
      }

      if (!isInitial && (changedFromTriggers.length > 0 || checksumChanged)) {
        console.log(`⚡ [Oracle Change Detected] User committed changes in Oracle! Syncing to SQLite...`);
        // Immediately synchronize changes from Oracle to SQLite
        const updatedCount = await syncOracleToSqlite(sqliteDb);

        this.emit('change', {
          tables: changedFromTriggers.length > 0 ? changedFromTriggers : ['vehicles'],
          timestamp: new Date().toISOString(),
          source: 'oracle'
        });
      }
    } catch (e) {
      // Continue without crashing on network or pool blips
    }
  }
}

// Singleton watcher instance
const watcher = new DBWatcher();

module.exports = watcher;
