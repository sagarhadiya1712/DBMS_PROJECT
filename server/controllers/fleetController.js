const db = require('../db/db');

// ================= MAINTENANCE CRUD =================
function getMaintenance(req, res, next) {
  try {
    const records = db.prepare(`
      SELECT m.*, v.name AS vehicle_name, v.brand AS vehicle_brand
      FROM maintenance m
      JOIN vehicles v ON m.vehicle_id = v.vehicle_id
      ORDER BY m.service_date DESC
    `).all();
    res.json(records);
  } catch (err) {
    next(err);
  }
}

function createMaintenance(req, res, next) {
  try {
    const { vehicle_id, service_date, cost, next_due_date, notes } = req.body;
    const result = db.prepare(`
      INSERT INTO maintenance (vehicle_id, service_date, cost, next_due_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(vehicle_id, service_date, cost, next_due_date || null, notes || null);

    const record = db.prepare('SELECT * FROM maintenance WHERE maintenance_id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

function updateMaintenance(req, res, next) {
  try {
    const { id } = req.params;
    const { service_date, cost, next_due_date, notes } = req.body;
    db.prepare(`
      UPDATE maintenance
      SET service_date = ?, cost = ?, next_due_date = ?, notes = ?
      WHERE maintenance_id = ?
    `).run(service_date, cost, next_due_date || null, notes || null, id);

    const updated = db.prepare('SELECT * FROM maintenance WHERE maintenance_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

function deleteMaintenance(req, res, next) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM maintenance WHERE maintenance_id = ?').run(id);
    res.json({ message: 'Maintenance record deleted', id });
  } catch (err) {
    next(err);
  }
}

// ================= FUEL CRUD =================
function getFuel(req, res, next) {
  try {
    const records = db.prepare(`
      SELECT f.*, v.name AS vehicle_name, v.brand AS vehicle_brand
      FROM fuel_records f
      JOIN vehicles v ON f.vehicle_id = v.vehicle_id
      ORDER BY f.date DESC
    `).all();
    res.json(records);
  } catch (err) {
    next(err);
  }
}

function createFuel(req, res, next) {
  try {
    const { vehicle_id, date, litres, cost } = req.body;
    const result = db.prepare(`
      INSERT INTO fuel_records (vehicle_id, date, litres, cost)
      VALUES (?, ?, ?, ?)
    `).run(vehicle_id, date, litres, cost);

    const record = db.prepare('SELECT * FROM fuel_records WHERE fuel_id = ?').get(result.lastInsertRowid);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

function deleteFuel(req, res, next) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM fuel_records WHERE fuel_id = ?').run(id);
    res.json({ message: 'Fuel record deleted', id });
  } catch (err) {
    next(err);
  }
}

// ================= DRIVERS CRUD =================
function getDrivers(req, res, next) {
  try {
    const drivers = db.prepare(`
      SELECT d.*, v.name AS vehicle_name, v.brand AS vehicle_brand
      FROM drivers d
      LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
      ORDER BY d.driver_id ASC
    `).all();
    res.json(drivers);
  } catch (err) {
    next(err);
  }
}

function createDriver(req, res, next) {
  try {
    const { name, phone, license_no, vehicle_id } = req.body;
    const result = db.prepare(`
      INSERT INTO drivers (name, phone, license_no, vehicle_id)
      VALUES (?, ?, ?, ?)
    `).run(name, phone, license_no, vehicle_id || null);

    const driver = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(result.lastInsertRowid);
    res.status(201).json(driver);
  } catch (err) {
    next(err);
  }
}

function updateDriver(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone, license_no, vehicle_id } = req.body;
    db.prepare(`
      UPDATE drivers
      SET name = ?, phone = ?, license_no = ?, vehicle_id = ?
      WHERE driver_id = ?
    `).run(name, phone, license_no, vehicle_id || null, id);

    const updated = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

function deleteDriver(req, res, next) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM drivers WHERE driver_id = ?').run(id);
    res.json({ message: 'Driver deleted', id });
  } catch (err) {
    next(err);
  }
}

// ================= DOCUMENTS CRUD =================
function getDocuments(req, res, next) {
  try {
    const docs = db.prepare(`
      SELECT d.*, v.name AS vehicle_name, v.brand AS vehicle_brand
      FROM vehicle_documents d
      JOIN vehicles v ON d.vehicle_id = v.vehicle_id
      ORDER BY d.expiry_date ASC
    `).all();
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

function createDocument(req, res, next) {
  try {
    const { vehicle_id, doc_type, file_url, expiry_date } = req.body;
    const result = db.prepare(`
      INSERT INTO vehicle_documents (vehicle_id, doc_type, file_url, expiry_date)
      VALUES (?, ?, ?, ?)
    `).run(vehicle_id, doc_type, file_url || null, expiry_date || null);

    const doc = db.prepare('SELECT * FROM vehicle_documents WHERE doc_id = ?').get(result.lastInsertRowid);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM vehicle_documents WHERE doc_id = ?').run(id);
    res.json({ message: 'Document deleted', id });
  } catch (err) {
    next(err);
  }
}

// ================= FLEET ALERTS =================
// Service, Insurance, Permit expiring in the next 15 days or expired
function getFleetAlerts(req, res, next) {
  try {
    // 1. Insurance Alerts
    const insuranceAlerts = db.prepare(`
      SELECT vehicle_id, name, brand, insurance_expiry AS expiry_date,
        'Insurance' AS alert_type,
        CAST((julianday(insurance_expiry) - julianday('now')) AS INT) AS days_remaining
      FROM vehicles
      WHERE insurance_expiry IS NOT NULL
        AND julianday(insurance_expiry) - julianday('now') <= 15
    `).all();

    // 2. Permit Alerts
    const permitAlerts = db.prepare(`
      SELECT vehicle_id, name, brand, permit_expiry AS expiry_date,
        'Permit' AS alert_type,
        CAST((julianday(permit_expiry) - julianday('now')) AS INT) AS days_remaining
      FROM vehicles
      WHERE permit_expiry IS NOT NULL
        AND julianday(permit_expiry) - julianday('now') <= 15
    `).all();

    // 3. Maintenance Service Alerts
    const serviceAlerts = db.prepare(`
      SELECT m.vehicle_id, v.name, v.brand, m.next_due_date AS expiry_date,
        'Maintenance Service' AS alert_type,
        CAST((julianday(m.next_due_date) - julianday('now')) AS INT) AS days_remaining
      FROM maintenance m
      JOIN vehicles v ON m.vehicle_id = v.vehicle_id
      WHERE m.next_due_date IS NOT NULL
        AND julianday(m.next_due_date) - julianday('now') <= 15
    `).all();

    const alerts = [...insuranceAlerts, ...permitAlerts, ...serviceAlerts].map(item => ({
      ...item,
      status: item.days_remaining < 0 ? 'Expired' : (item.days_remaining <= 15 ? 'Urgent' : 'Upcoming')
    }));

    res.json(alerts);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getFuel,
  createFuel,
  deleteFuel,
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  getDocuments,
  createDocument,
  deleteDocument,
  getFleetAlerts
};
