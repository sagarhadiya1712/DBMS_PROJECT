const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const config = require('./config');

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
app.use('/api', limiter);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload directory exists and serve static uploads
const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.resolve(config.UPLOAD_DIR);
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create upload directory:', e.message);
}
app.use('/uploads', express.static(uploadDir));

// Determine static client directories (supports both standalone server deploy and monorepo root deploy)
const possiblePublicDirs = [
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../client/dist'),
];

let clientDistPath = null;
for (const dir of possiblePublicDirs) {
  if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
    clientDistPath = dir;
    break;
  }
}

if (clientDistPath) {
  app.use(express.static(clientDistPath));
}

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

// API Welcome & Directory Route
app.get('/api', (req, res) => {
  res.json({
    status: 'online',
    service: 'Fleet Rental & Fleet Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      settings: '/api/settings',
      vehicles: '/api/vehicles',
      branches: '/api/branches',
      auth: '/api/auth',
    },
  });
});

// API Routes Mount
app.use('/api', apiRoutes);

// SPA Frontend Catch-All & 404 Handler
app.use((req, res, next) => {
  // Any unmatched /api or /uploads request returns a clean 404 JSON
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  }

  // Serve Single Page Application frontend for all web browser routes (/, /vehicles, /login, etc.)
  if (clientDistPath && fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }

  // Fallback if client is not built
  if (req.method === 'GET' && req.path === '/') {
    return res.json({
      status: 'online',
      service: 'Fleet Rental & Fleet Management System API',
      version: '1.0.0',
      message: 'Backend API is active. To access frontend, build client or check public directory.',
      endpoints: {
        health: '/api/health',
        settings: '/api/settings',
        vehicles: '/api/vehicles',
        branches: '/api/branches',
      },
    });
  }

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
