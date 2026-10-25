const fs = require('fs');
const path = require('path');
const db = require('./db');

function initDB() {
  console.log('🔄 Initializing SQLite database from schema.sql...');
  const sqliteSchema = path.join(__dirname, 'schema_sqlite.sql');
  const fallbackSchema = path.join(__dirname, 'schema.sql');
  const schemaPath = fs.existsSync(sqliteSchema) ? sqliteSchema : fallbackSchema;
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema definitions
  db.exec(schemaSql);
  console.log('✅ SQLite database schema successfully initialized in server/db/rental.db');
}

if (require.main === module) {
  try {
    initDB();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  }
}

module.exports = initDB;
