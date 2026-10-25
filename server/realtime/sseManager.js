const jwt = require('jsonwebtoken');
const dbWatcher = require('./dbWatcher');

const JWT_SECRET = process.env.JWT_SECRET || 'vehicle-rental-jwt-secret-key-2025-secure-token';
const MAX_SSE_CONNECTIONS = 150;

// Table access permissions by role
const PUBLIC_TABLES = new Set(['vehicles', 'vehicle_images', 'reviews', 'discounts']);
const CUSTOMER_TABLES = new Set([
  'vehicles',
  'vehicle_images',
  'reviews',
  'discounts',
  'bookings',
  'payments',
  'users'
]);
const OWNER_TABLES = new Set([
  'vehicles',
  'vehicle_images',
  'reviews',
  'discounts',
  'bookings',
  'payments',
  'owner_profiles',
  'owner_payouts',
  'vehicle_documents',
  'kyc_documents'
]);

class SSEManager {
  constructor() {
    this.clients = new Set();
    this.clientIdCounter = 1;

    // Attach DB watcher listener to broadcast change events
    dbWatcher.on('change', (eventData) => {
      this.broadcastChange(eventData);
    });

    console.log('📡 [SSE Manager] Initialized with role-based filtering.');
  }

  /**
   * Handle incoming GET /api/realtime/stream connection
   */
  handleConnection(req, res) {
    if (this.clients.size >= MAX_SSE_CONNECTIONS) {
      return res.status(503).json({ error: 'Max realtime connections reached. Please retry shortly.' });
    }

    // 1. Authenticate user from query parameter or header (EventSource does not support custom headers natively)
    const token =
      req.query.token ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    let user = { role: 'guest', user_id: null };
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = {
          user_id: decoded.user_id,
          role: String(decoded.role || 'customer').toLowerCase(),
          email: decoded.email
        };
      } catch (err) {
        // Fall back to guest role if token invalid/expired
        user = { role: 'guest', user_id: null };
      }
    }

    // 2. Set strict Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Critical for Nginx / reverse proxies to disable chunk buffering
      'Access-Control-Allow-Origin': req.headers.origin || '*'
    });

    res.flushHeaders?.();

    const clientId = this.clientIdCounter++;
    const client = {
      id: clientId,
      res,
      user,
      connectedAt: new Date()
    };

    this.clients.add(client);
    console.log(`🔌 [SSE Client Connect] ID: ${clientId} | Role: ${user.role} | Active Clients: ${this.clients.size}`);

    // Send initial connection event
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        status: 'connected',
        role: user.role,
        clientId,
        timestamp: new Date().toISOString()
      })}\n\n`
    );

    // 3. Heartbeat comment every 25 seconds to keep connection alive through NAT / firewalls
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeatTimer);
      }
    }, 25000);

    // 4. Handle client disconnection cleanup
    req.on('close', () => {
      clearInterval(heartbeatTimer);
      this.clients.delete(client);
      console.log(`❌ [SSE Client Disconnect] ID: ${clientId} | Active Clients: ${this.clients.size}`);
    });
  }

  /**
   * Broadcast changed tables to all connected SSE clients according to role
   */
  broadcastChange(eventData) {
    const { tables, timestamp, dataVersion } = eventData;
    if (!tables || tables.length === 0) return;

    console.log(`⚡ [SSE Broadcast] DB Changed Tables: [${tables.join(', ')}] -> Notifying ${this.clients.size} clients`);

    for (const client of this.clients) {
      try {
        const userRole = (client.user.role || 'guest').toLowerCase();

        // Role-based table filtering
        let allowedTables = [];
        if (userRole === 'admin') {
          allowedTables = tables; // Admins receive all change notifications
        } else if (userRole === 'owner') {
          allowedTables = tables.filter((t) => OWNER_TABLES.has(t));
        } else if (userRole === 'customer') {
          allowedTables = tables.filter((t) => CUSTOMER_TABLES.has(t));
        } else {
          // Guests see public catalog changes only
          allowedTables = tables.filter((t) => PUBLIC_TABLES.has(t));
        }

        if (allowedTables.length > 0) {
          const payload = JSON.stringify({
            tables: allowedTables,
            at: timestamp,
            version: dataVersion || Date.now()
          });
          client.res.write(`event: db-change\ndata: ${payload}\n\n`);
        }
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Status check
   */
  getStatus() {
    return {
      activeConnections: this.clients.size,
      watcherRunning: !!dbWatcher.timer
    };
  }
}

const sseManager = new SSEManager();

module.exports = sseManager;
