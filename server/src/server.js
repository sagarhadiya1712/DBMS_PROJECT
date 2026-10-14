const app = require('./app');
const config = require('./config');
const prisma = require('./config/db');
const { initCronJobs } = require('./cron/alertCron');

const PORT = config.PORT || 5000;

const startServer = async () => {
  // Startup database check with 3-attempt retry for Neon serverless wake-up
  try {
    if (typeof prisma.connectWithRetry === 'function') {
      await prisma.connectWithRetry(3, 3000);
    }
  } catch (err) {
    console.error('⚠️ Note: Database connection to Neon failed at startup. Please verify DATABASE_URL in server/.env.');
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Fleet Rental Server running in ${config.NODE_ENV} mode on port ${PORT}`);
    console.log(`🌐 Base API URL: http://localhost:${PORT}/api`);
    console.log(`📁 File uploads served from: http://localhost:${PORT}/uploads`);

    // Initialize automated fleet maintenance and expiry alert cron
    initCronJobs();
  });

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Server process terminated.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
};

const server = startServer();

module.exports = server;
