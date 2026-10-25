const { z } = require('zod');
const db = require('../db/db');

// Validation schema for vehicle creation/update
const vehicleSchema = z.object({
  name: z.string().min(2),
  brand: z.string().min(2),
  category: z.enum(['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury']),
  fuel_type: z.string().min(2),
  transmission: z.string().min(2),
  seats: z.coerce.number().int().min(2).max(12),
  price_per_day: z.coerce.number().positive(),
  price_per_hour: z.coerce.number().positive(),
  price_per_km: z.coerce.number().positive(),
  security_deposit: z.coerce.number().nonnegative(),
  status: z.enum(['Available', 'Rented', 'In Service']).default('Available'),
  image_url: z.string().optional().nullable(),
  is_chauffeur_driven: z.coerce.number().int().min(0).max(1).default(0),
  insurance_expiry: z.string().optional().nullable(),
  permit_expiry: z.string().optional().nullable()
});

// GET /api/vehicles
function listVehicles(req, res, next) {
  try {
    const {
      category,
      fuel_type,
      seats,
      min_price,
      max_price,
      transmission,
      search,
      sort,
      start_datetime,
      end_datetime
    } = req.query;

    let query = `
      SELECT v.*,
        COALESCE(ROUND(AVG(r.rating), 1), 5.0) AS avg_rating,
        COUNT(r.review_id) AS total_reviews,
        d.name AS driver_name,
        d.phone AS driver_phone
      FROM vehicles v
      LEFT JOIN reviews r ON v.vehicle_id = r.vehicle_id
      LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ` AND v.category = ?`;
      params.push(category);
    }

    if (fuel_type) {
      query += ` AND v.fuel_type LIKE ?`;
      params.push(`%${fuel_type}%`);
    }

    if (seats) {
      query += ` AND v.seats >= ?`;
      params.push(Number(seats));
    }

    if (transmission) {
      query += ` AND v.transmission LIKE ?`;
      params.push(`%${transmission}%`);
    }

    if (min_price) {
      query += ` AND v.price_per_day >= ?`;
      params.push(Number(min_price));
    }

    if (max_price) {
      query += ` AND v.price_per_day <= ?`;
      params.push(Number(max_price));
    }

    if (search) {
      query += ` AND (v.name LIKE ? OR v.brand LIKE ? OR v.category LIKE ?)`;
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    // Availability filter for date range
    if (start_datetime && end_datetime) {
      query += `
        AND v.vehicle_id NOT IN (
          SELECT b.vehicle_id FROM bookings b
          WHERE b.status IN ('Pending', 'Approved', 'Active')
            AND NOT (b.end_datetime <= ? OR b.start_datetime >= ?)
        )
      `;
      params.push(start_datetime, end_datetime);
    }

    query += ` GROUP BY v.vehicle_id`;

    // Sorting
    if (sort === 'price_asc') {
      query += ` ORDER BY v.price_per_day ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY v.price_per_day DESC`;
    } else if (sort === 'rating') {
      query += ` ORDER BY avg_rating DESC`;
    } else {
      query += ` ORDER BY v.created_at DESC`;
    }

    const vehicles = db.prepare(query).all(...params);
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
}

// GET /api/vehicles/:id
function getVehicleById(req, res, next) {
  try {
    const { id } = req.params;

    const vehicle = db.prepare(`
      SELECT v.*,
        COALESCE(ROUND(AVG(r.rating), 1), 5.0) AS avg_rating,
        COUNT(r.review_id) AS total_reviews,
        d.driver_id,
        d.name AS driver_name,
        d.phone AS driver_phone,
        d.license_no AS driver_license
      FROM vehicles v
      LEFT JOIN reviews r ON v.vehicle_id = r.vehicle_id
      LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
      WHERE v.vehicle_id = ?
      GROUP BY v.vehicle_id
    `).get(id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    // Fetch individual reviews
    const reviews = db.prepare(`
      SELECT r.*, u.name AS reviewer_name
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.vehicle_id = ?
      ORDER BY r.created_at DESC
    `).all(id);

    // Fetch existing active/approved booked date ranges to inform customer calendar
    const bookedRanges = db.prepare(`
      SELECT booking_id, start_datetime, end_datetime, status
      FROM bookings
      WHERE vehicle_id = ? AND status IN ('Pending', 'Approved', 'Active')
      ORDER BY start_datetime ASC
    `).all(id);

    res.json({
      ...vehicle,
      reviews,
      booked_ranges: bookedRanges
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/vehicles (Admin)
function createVehicle(req, res, next) {
  try {
    const data = vehicleSchema.parse(req.body);

    const result = db.prepare(`
      INSERT INTO vehicles (
        name, brand, category, fuel_type, transmission, seats,
        price_per_day, price_per_hour, price_per_km, security_deposit,
        status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name, data.brand, data.category, data.fuel_type, data.transmission, data.seats,
      data.price_per_day, data.price_per_hour, data.price_per_km, data.security_deposit,
      data.status || 'Available', data.image_url || null, data.is_chauffeur_driven || 0,
      data.insurance_expiry || null, data.permit_expiry || null
    );

    const newVehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(result.lastInsertRowid);
    res.status(201).json(newVehicle);
  } catch (err) {
    next(err);
  }
}

// PUT /api/vehicles/:id (Admin)
function updateVehicle(req, res, next) {
  try {
    const { id } = req.params;
    const data = vehicleSchema.parse(req.body);

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    db.prepare(`
      UPDATE vehicles SET
        name = ?, brand = ?, category = ?, fuel_type = ?, transmission = ?, seats = ?,
        price_per_day = ?, price_per_hour = ?, price_per_km = ?, security_deposit = ?,
        status = ?, image_url = ?, is_chauffeur_driven = ?, insurance_expiry = ?, permit_expiry = ?
      WHERE vehicle_id = ?
    `).run(
      data.name, data.brand, data.category, data.fuel_type, data.transmission, data.seats,
      data.price_per_day, data.price_per_hour, data.price_per_km, data.security_deposit,
      data.status, data.image_url, data.is_chauffeur_driven, data.insurance_expiry, data.permit_expiry,
      id
    );

    const updated = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/vehicles/:id (Admin)
function deleteVehicle(req, res, next) {
  try {
    const { id } = req.params;
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check for active bookings
    const active = db.prepare(`
      SELECT count(*) as count FROM bookings
      WHERE vehicle_id = ? AND status IN ('Active', 'Approved')
    `).get(id);

    if (active.count > 0) {
      return res.status(400).json({ error: 'Cannot delete vehicle with active or upcoming approved bookings.' });
    }

    db.prepare('DELETE FROM vehicles WHERE vehicle_id = ?').run(id);
    res.json({ message: 'Vehicle deleted successfully', vehicle_id: id });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/vehicles/:id/status (Admin)
function updateVehicleStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Available', 'Rented', 'In Service'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Available, Rented, or In Service.' });
    }

    db.prepare('UPDATE vehicles SET status = ? WHERE vehicle_id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateVehicleStatus
};
