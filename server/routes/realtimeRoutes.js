const express = require('express');
const router = express.Router();
const sseManager = require('../realtime/sseManager');

// GET /api/realtime/stream - Server-Sent Events stream
router.get('/stream', (req, res) => {
  sseManager.handleConnection(req, res);
});

// GET /api/realtime/status - Operational status
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    ...sseManager.getStatus(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
