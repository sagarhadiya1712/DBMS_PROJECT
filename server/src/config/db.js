const { PrismaClient } = require('@prisma/client');

let prisma;

// Single shared Prisma Client instance across the entire application
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

/**
 * Startup database health check with retry logic for Neon serverless cold-start
 * @param {number} maxRetries - Maximum retry attempts (default 3)
 * @param {number} delayMs - Delay between retries in milliseconds (default 3000ms)
 */
const connectWithRetry = async (maxRetries = 3, delayMs = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected (Neon)');
      return true;
    } catch (err) {
      if (attempt < maxRetries) {
        console.warn(`⚠️ Database connection attempt ${attempt}/${maxRetries} failed. Neon may be waking up... waiting ${delayMs / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('❌ Database connection failed after 3 attempts (Neon):', err.message);
        throw err;
      }
    }
  }
};

prisma.connectWithRetry = connectWithRetry;

module.exports = prisma;
