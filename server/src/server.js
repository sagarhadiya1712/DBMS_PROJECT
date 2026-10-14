const app = require('./app');
const config = require('./config');
const { initCronJobs } = require('./cron/alertCron');

const PORT = config.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Fleet Rental Server running in ${config.NODE_ENV} mode on port ${PORT}`);
  console.log(`🌐 Base API URL: http://localhost:${PORT}/api`);
  console.log(`📁 File uploads served from: http://localhost:${PORT}/uploads`);

  // Initialize automated fleet maintenance and expiry alert cron
  initCronJobs();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server process terminated.');
  });
});

module.exports = server;
