require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const compression = require('compression');

// Middlewares
const errorHandler = require('./middleware/errorHandler');

// Route handlers
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const fleetRoutes = require('./routes/fleetRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const userRoutes = require('./routes/userRoutes');
const discountRoutes = require('./routes/discountRoutes');
const kycRoutes = require('./routes/kycRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const fileRoutes = require('./routes/fileRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');
const dbWatcher = require('./realtime/dbWatcher');

// Cron jobs
const { initCronJobs } = require('./cron/jobs');

const app = express();
const PORT = process.env.PORT || 5000;

// Gzip Compression - bypass for SSE stream so events are never buffered
app.use(
  compression({
    filter: (req, res) => {
      if (req.path && req.path.includes('/realtime/stream')) {
        return false;
      }
      return compression.filter(req, res);
    }
  })
);

// Security Headers with relaxed cross-origin policies for images/static assets
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration
app.use(
  cors({
    origin: true, // Allow frontend on localhost or any deployed origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static vehicle images and uploads with Cache-Control
const staticOptions = {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'SQLite (rental.db)'
  });
});

// Dev-Only Live Database Inspection Endpoint
app.get('/api/dev/db-inspect', (req, res) => {
  const db = require('./db/db');
  const fs = require('fs');
  const dbPath = path.join(__dirname, 'db', 'rental.db');

  const journalMode = db.pragma('journal_mode', { simple: true });
  const foreignKeys = db.pragma('foreign_keys', { simple: true });
  const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;

  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const vehiclesCount = db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count;
  const bookingsCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  const otpsCount = db.prepare('SELECT COUNT(*) as count FROM email_otps').get().count;

  const recentUsers = db.prepare(`
    SELECT user_id, name, email, phone, role, is_verified, is_blocked, google_id, created_at 
    FROM users ORDER BY user_id DESC LIMIT 5
  `).all();

  const recentOtps = db.prepare(`
    SELECT otp_id, email, used, attempts, expires_at, created_at 
    FROM email_otps ORDER BY otp_id DESC LIMIT 5
  `).all();

  res.json({
    status: 'success',
    database: {
      file: dbPath,
      sizeBytes: stats ? stats.size : 0,
      lastModified: stats ? stats.mtime : null,
      journal_mode: String(journalMode).toUpperCase(),
      foreign_keys: foreignKeys === 1 ? 'ON' : 'OFF',
    },
    counts: {
      users: usersCount,
      vehicles: vehiclesCount,
      bookings: bookingsCount,
      email_otps: otpsCount
    },
    recentUsers,
    recentOtps
  });
});

// GET /api/dev/db-check - Table row counts across all 16 tables in rental.db
app.get('/api/dev/db-check', (req, res) => {
  const db = require('./db/db');
  const tables = [
    'users', 'email_otps', 'vehicles', 'vehicle_images', 'bookings',
    'payments', 'maintenance', 'fuel_records', 'drivers', 'reviews',
    'discounts', 'vehicle_documents', 'kyc_documents', 'owner_profiles',
    'owner_payouts', 'audit_logs'
  ];

  const counts = {};
  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT count(*) as count FROM ${table}`).get();
      counts[table] = row.count;
    } catch (err) {
      counts[table] = `Error: ${err.message}`;
    }
  }

  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    total_tables: tables.length,
    counts
  });
});

// Prevent caching on /api JSON responses to ensure fresh real-time sync data
app.use('/api', (req, res, next) => {
  if (!req.path.startsWith('/realtime/stream')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/realtime', realtimeRoutes);

// Central Error Handler
app.use(errorHandler);

// Start Server only if directly invoked via `node server.js`
if (require.main === module && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Fleet Rental API Server listening on port ${PORT}`);
    console.log(`📡 Base URL: http://localhost:${PORT}/api`);
    console.log(`🚗 Database: ${path.join(__dirname, 'db', 'rental.db')}`);

    // Start Realtime Database Watcher
    dbWatcher.start();

    // Initialize scheduled cron jobs
    initCronJobs();

    // Auto-sync with Oracle Free Database (DBMS_PROJ) if configured
    try {
      const { initOracleSchema, syncSqliteToOracle } = require('./db/oracle');
      const sqliteDb = require('./db/db');
      initOracleSchema()
        .then(() => syncSqliteToOracle(sqliteDb))
        .catch((err) => console.warn('⚠️ [Oracle Startup Notice]:', err.message));
    } catch (e) {
      // Continue seamlessly if oracledb is not loaded
    }
  });
}

module.exports = app;
