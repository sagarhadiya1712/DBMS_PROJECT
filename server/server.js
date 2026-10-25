require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

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

// Cron jobs
const { initCronJobs } = require('./cron/jobs');

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static vehicle images and uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'SQLite (rental.db)'
  });
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

// Central Error Handler
app.use(errorHandler);

// Start Server if directly invoked
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Fleet Rental API Server listening on port ${PORT}`);
    console.log(`📡 Base URL: http://localhost:${PORT}/api`);
    console.log(`🚗 Database: ${path.join(__dirname, 'db', 'rental.db')}`);
    console.log(`======================================================\n`);

    // Initialize scheduled cron jobs
    initCronJobs();
  });
}

module.exports = app;
