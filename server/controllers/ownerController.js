const db = require('../db/db');
const { z } = require('zod');
const { encrypt, decrypt, maskAccountNumber } = require('../utils/encryption');
const { logAudit } = require('../utils/auditLogger');
const { sendVehicleApprovalEmail, sendVehicleRejectionEmail } = require('../utils/emailService');

// Indian registration number regex: e.g., MH12AB1234, DL01A1234, GJ05CD5678
const REG_NO_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i;

// Owner Profile Schema
const ownerProfileSchema = z.object({
  business_name: z.string().optional().nullable(),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  bank_account_holder: z.string().min(2, 'Bank account holder name is required'),
  bank_account_number: z.string().min(8, 'Valid bank account number is required'),
  ifsc: z.string().min(4, 'Valid IFSC code is required'),
  upi_id: z.string().optional().nullable()
});

// Add Vehicle Schema
const addVehicleSchema = z.object({
  brand: z.string().min(2, 'Brand is required'),
  name: z.string().min(2, 'Model name is required'),
  category: z.enum(['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury']),
  fuel_type: z.string().min(2),
  transmission: z.string().min(2),
  seats: z.coerce.number().int().min(2).max(12),
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear() + 1),
  registration_number: z.string().regex(REG_NO_REGEX, 'Registration number must be in standard Indian format (e.g. GJ05AB1234, MH12DE5678)'),
  price_per_day: z.coerce.number().positive(),
  price_per_hour: z.coerce.number().positive(),
  price_per_km: z.coerce.number().positive(),
  security_deposit: z.coerce.number().nonnegative().default(3000),
  city: z.string().min(2, 'Pickup city is required'),
  address: z.string().optional().nullable(),
  is_draft: z.boolean().optional().default(false),
  // Photos array: min 5 for final submission: Front, Back, Left, Right, Interior
  photos: z.array(z.object({
    file_path: z.string(),
    thumb_path: z.string().optional().nullable(),
    image_type: z.enum(['Front', 'Back', 'Left', 'Right', 'Interior', 'Other']),
    is_primary: z.boolean().optional().default(false)
  })).optional().default([]),
  // Documents: RC, Insurance, PUC, Permit
  documents: z.array(z.object({
    doc_type: z.enum(['RC', 'Insurance', 'PUC', 'Permit']),
    file_path: z.string(),
    expiry_date: z.string().optional().nullable()
  })).optional().default([])
});

/**
 * GET /api/owner/profile
 */
function getOwnerProfile(req, res, next) {
  try {
    const ownerId = req.user.user_id;
    const profile = db.prepare('SELECT * FROM owner_profiles WHERE owner_id = ?').get(ownerId);
    const user = db.prepare('SELECT user_id, name, email, phone, kyc_status FROM users WHERE user_id = ?').get(ownerId);

    if (!profile) {
      return res.json({
        exists: false,
        user,
        profile: null
      });
    }

    let maskedAccount = null;
    if (profile.bank_account_number_enc) {
      try {
        const decryptedAcc = decrypt(profile.bank_account_number_enc);
        maskedAccount = maskAccountNumber(decryptedAcc);
      } catch (e) {
        maskedAccount = '•••• ••••';
      }
    }

    res.json({
      exists: true,
      user,
      profile: {
        ...profile,
        bank_account_number_enc: undefined,
        bank_account_masked: maskedAccount
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/owner/profile
 */
function saveOwnerProfile(req, res, next) {
  try {
    const data = ownerProfileSchema.parse(req.body);
    const ownerId = req.user.user_id;

    const encAccount = encrypt(data.bank_account_number.trim());

    const existing = db.prepare('SELECT owner_id FROM owner_profiles WHERE owner_id = ?').get(ownerId);

    if (existing) {
      db.prepare(`
        UPDATE owner_profiles
        SET business_name = ?, address = ?, city = ?, bank_account_holder = ?,
            bank_account_number_enc = ?, ifsc = ?, upi_id = ?
        WHERE owner_id = ?
      `).run(
        data.business_name || null,
        data.address.trim(),
        data.city.trim(),
        data.bank_account_holder.trim(),
        encAccount,
        data.ifsc.trim().toUpperCase(),
        data.upi_id ? data.upi_id.trim() : null,
        ownerId
      );
    } else {
      db.prepare(`
        INSERT INTO owner_profiles (owner_id, business_name, address, city, bank_account_holder, bank_account_number_enc, ifsc, upi_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ownerId,
        data.business_name || null,
        data.address.trim(),
        data.city.trim(),
        data.bank_account_holder.trim(),
        encAccount,
        data.ifsc.trim().toUpperCase(),
        data.upi_id ? data.upi_id.trim() : null
      );
    }

    logAudit(ownerId, 'SAVE_OWNER_PROFILE', 'owner_profiles', ownerId, {
      city: data.city,
      bank_holder: data.bank_account_holder
    });

    res.json({
      message: 'Owner profile saved successfully!',
      bank_account_masked: maskAccountNumber(data.bank_account_number.trim())
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/owner/vehicles
 * Multi-step Add Vehicle
 */
function addOwnerVehicle(req, res, next) {
  try {
    const data = addVehicleSchema.parse(req.body);
    const ownerId = req.user.user_id;

    // Check Owner KYC Status: must be Approved before listing vehicles!
    const owner = db.prepare('SELECT user_id, kyc_status, is_blocked FROM users WHERE user_id = ?').get(ownerId);
    if (!owner) return res.status(404).json({ error: 'User not found.' });

    if (owner.is_blocked) {
      return res.status(403).json({ error: 'Your owner account has been suspended.' });
    }

    if (owner.kyc_status !== 'Approved' && !data.is_draft) {
      return res.status(403).json({
        error: 'KYC Approval Required: Your identity verification must be approved by the admin team before you can submit vehicles for listing.'
      });
    }

    const regNo = data.registration_number.trim().toUpperCase();

    // Check duplicate registration number
    const dupReg = db.prepare('SELECT vehicle_id FROM vehicles WHERE registration_number = ? AND deleted_at IS NULL').get(regNo);
    if (dupReg) {
      return res.status(409).json({ error: `A vehicle with registration number ${regNo} is already registered.` });
    }

    // If final submission (not draft): require at least 5 photos and RC + Insurance
    if (!data.is_draft) {
      if (!data.photos || data.photos.length < 5) {
        return res.status(400).json({
          error: 'Vehicle submission requires at least 5 distinct photos (Front, Back, Left, Right, Interior).'
        });
      }

      const rcDoc = data.documents.find(d => d.doc_type === 'RC');
      const insDoc = data.documents.find(d => d.doc_type === 'Insurance');
      if (!rcDoc || !insDoc) {
        return res.status(400).json({
          error: 'Both RC (Registration Certificate) and Insurance documents are mandatory.'
        });
      }

      if (insDoc.expiry_date && new Date(insDoc.expiry_date) <= new Date()) {
        return res.status(400).json({ error: 'Vehicle insurance expiry date must be in the future.' });
      }
    }

    // Primary photo determination
    let primaryPhoto = data.photos.find(p => p.is_primary) || data.photos[0];
    const primaryImgUrl = primaryPhoto ? primaryPhoto.file_path : '/images/vehicles/creta.png';

    const tx = db.transaction(() => {
      const approvalStatus = data.is_draft ? 'Draft' : 'Pending Approval';

      const insertVehicle = db.prepare(`
        INSERT INTO vehicles (
          name, brand, category, fuel_type, transmission, seats,
          price_per_day, price_per_hour, price_per_km, security_deposit,
          status, image_url, owner_id, registration_number, approval_status,
          insurance_expiry
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name.trim(),
        data.brand.trim(),
        data.category,
        data.fuel_type,
        data.transmission,
        data.seats,
        data.price_per_day,
        data.price_per_hour,
        data.price_per_km,
        data.security_deposit,
        'Available',
        primaryImgUrl,
        ownerId,
        regNo,
        approvalStatus,
        data.documents.find(d => d.doc_type === 'Insurance')?.expiry_date || null
      );

      const vehicleId = insertVehicle.lastInsertRowid;

      // Save photos in vehicle_images
      for (let i = 0; i < data.photos.length; i++) {
        const photo = data.photos[i];
        const isPrimary = (primaryPhoto && photo.file_path === primaryPhoto.file_path) || (i === 0 && !primaryPhoto);
        db.prepare(`
          INSERT INTO vehicle_images (vehicle_id, file_path, thumb_path, image_type, is_primary)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          vehicleId,
          photo.file_path,
          photo.thumb_path || photo.file_path,
          photo.image_type || 'Other',
          isPrimary ? 1 : 0
        );
      }

      // Save documents in vehicle_documents
      for (const doc of data.documents) {
        db.prepare(`
          INSERT INTO vehicle_documents (vehicle_id, doc_type, file_path, expiry_date, status)
          VALUES (?, ?, ?, ?, 'Pending')
        `).run(
          vehicleId,
          doc.doc_type,
          doc.file_path,
          doc.expiry_date || null
        );
      }

      logAudit(ownerId, 'ADD_OWNER_VEHICLE', 'vehicles', vehicleId, {
        brand: data.brand,
        name: data.name,
        registration_number: regNo,
        approval_status: approvalStatus
      });

      return vehicleId;
    });

    const vehicleId = tx();
    const created = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId);

    res.status(201).json({
      message: data.is_draft
        ? 'Vehicle saved as draft.'
        : 'Vehicle submitted successfully and is pending admin approval.',
      vehicle: created
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/owner/vehicles
 * List all vehicles owned by logged-in owner
 */
function getOwnerVehicles(req, res, next) {
  try {
    const ownerId = req.user.user_id;
    const vehicles = db.prepare(`
      SELECT v.*,
             (SELECT count(*) FROM bookings b WHERE b.vehicle_id = v.vehicle_id) AS total_bookings,
             (SELECT count(*) FROM vehicle_images vi WHERE vi.vehicle_id = v.vehicle_id) AS photo_count
      FROM vehicles v
      WHERE v.owner_id = ? AND v.deleted_at IS NULL
      ORDER BY v.created_at DESC
    `).all(ownerId);

    const vehiclesWithPhotos = vehicles.map(v => {
      const photos = db.prepare('SELECT * FROM vehicle_images WHERE vehicle_id = ?').all(v.vehicle_id);
      const docs = db.prepare('SELECT * FROM vehicle_documents WHERE vehicle_id = ?').all(v.vehicle_id);
      return { ...v, photos, documents: docs };
    });

    res.json(vehiclesWithPhotos);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/owner/vehicles/:id
 */
function getOwnerVehicleDetails(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = req.user.user_id;

    const vehicle = db.prepare(`
      SELECT * FROM vehicles WHERE vehicle_id = ? AND owner_id = ? AND deleted_at IS NULL
    `).get(id, ownerId);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found or you do not have permission to access it.' });
    }

    const photos = db.prepare('SELECT * FROM vehicle_images WHERE vehicle_id = ?').all(id);
    const documents = db.prepare('SELECT * FROM vehicle_documents WHERE vehicle_id = ?').all(id);

    res.json({
      vehicle,
      photos,
      documents
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/owner/vehicles/:id/availability
 * Owner toggling vehicle between Available and In Service
 */
function toggleVehicleAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = req.user.user_id;

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ? AND owner_id = ? AND deleted_at IS NULL').get(id, ownerId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found or not owned by you.' });
    }

    if (vehicle.approval_status !== 'Approved') {
      return res.status(400).json({ error: 'Only admin-approved vehicles can be toggled for booking availability.' });
    }

    const newStatus = vehicle.status === 'Available' ? 'In Service' : 'Available';
    db.prepare('UPDATE vehicles SET status = ? WHERE vehicle_id = ?').run(newStatus, id);

    logAudit(ownerId, 'TOGGLE_VEHICLE_AVAILABILITY', 'vehicles', id, { status: newStatus });

    res.json({
      message: `Vehicle availability set to ${newStatus}.`,
      vehicle_id: id,
      status: newStatus
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/owner/bookings
 * Bookings for vehicles belonging to this owner
 */
function getOwnerBookings(req, res, next) {
  try {
    const ownerId = req.user.user_id;

    const bookings = db.prepare(`
      SELECT b.*,
             v.name AS vehicle_name, v.brand AS vehicle_brand, v.registration_number,
             u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
             p.payment_status, p.payment_method, p.transaction_id,
             op.payout_id, op.gross_amount, op.commission_amount, op.payout_amount, op.status AS payout_status
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      JOIN users u ON b.user_id = u.user_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id
      LEFT JOIN owner_payouts op ON b.booking_id = op.booking_id
      WHERE v.owner_id = ? AND b.deleted_at IS NULL
      ORDER BY b.created_at DESC
    `).all(ownerId);

    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/owner/bookings/:id/cod-received
 * Owner marks that COD cash was received for their vehicle
 */
function markCodReceived(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = req.user.user_id;

    const booking = db.prepare(`
      SELECT b.*, v.owner_id
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE b.booking_id = ? AND b.deleted_at IS NULL
    `).get(id);

    if (!booking || booking.owner_id !== ownerId) {
      return res.status(404).json({ error: 'Booking not found or not your vehicle.' });
    }

    if (booking.payment_method !== 'COD') {
      return res.status(400).json({ error: 'This booking was not placed as Cash on Delivery.' });
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE payments
        SET payment_status = 'Paid', updated_at = datetime('now')
        WHERE booking_id = ?
      `).run(id);

      logAudit(ownerId, 'OWNER_COD_CASH_COLLECTED', 'payments', id, {
        booking_id: id,
        total_amount: booking.total_amount
      });
    });

    tx();

    res.json({
      message: 'Cash on delivery marked as received successfully.',
      booking_id: id,
      payment_status: 'Paid'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/owner/dashboard
 * Aggregated statistics and document alerts for owner
 */
function getOwnerDashboard(req, res, next) {
  try {
    const ownerId = req.user.user_id;

    // Vehicle statistics
    const totalVehicles = db.prepare('SELECT count(*) as count FROM vehicles WHERE owner_id = ? AND deleted_at IS NULL').get(ownerId).count;
    const approvedVehicles = db.prepare("SELECT count(*) as count FROM vehicles WHERE owner_id = ? AND approval_status = 'Approved' AND deleted_at IS NULL").get(ownerId).count;
    const pendingVehicles = db.prepare("SELECT count(*) as count FROM vehicles WHERE owner_id = ? AND approval_status = 'Pending Approval' AND deleted_at IS NULL").get(ownerId).count;

    // Financial statistics from owner_payouts
    const financialStats = db.prepare(`
      SELECT
        COALESCE(SUM(payout_amount), 0) AS total_earnings,
        COALESCE(SUM(CASE WHEN status = 'Pending' THEN payout_amount ELSE 0 END), 0) AS pending_payout,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN payout_amount ELSE 0 END), 0) AS paid_payout
      FROM owner_payouts
      WHERE owner_id = ?
    `).get(ownerId);

    // Bookings count
    const totalBookings = db.prepare(`
      SELECT count(*) as count
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE v.owner_id = ? AND b.deleted_at IS NULL
    `).get(ownerId).count;

    // Document expiry alerts (Insurance, PUC within 15 days)
    const expiryAlerts = db.prepare(`
      SELECT vd.doc_id, vd.doc_type, vd.expiry_date, v.vehicle_id, v.brand, v.name, v.registration_number,
             CAST((julianday(vd.expiry_date) - julianday('now')) AS INT) AS days_remaining
      FROM vehicle_documents vd
      JOIN vehicles v ON vd.vehicle_id = v.vehicle_id
      WHERE v.owner_id = ? AND vd.expiry_date IS NOT NULL
        AND (julianday(vd.expiry_date) - julianday('now')) <= 15
      ORDER BY vd.expiry_date ASC
    `).all(ownerId);

    const user = db.prepare('SELECT kyc_status, kyc_rejection_reason FROM users WHERE user_id = ?').get(ownerId);

    res.json({
      kyc_status: user.kyc_status,
      kyc_rejection_reason: user.kyc_rejection_reason,
      total_vehicles: totalVehicles,
      approved_vehicles: approvedVehicles,
      pending_vehicles: pendingVehicles,
      total_bookings: totalBookings,
      total_earnings: financialStats.total_earnings,
      pending_payout: financialStats.pending_payout,
      paid_payout: financialStats.paid_payout,
      expiry_alerts: expiryAlerts
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/owner/payouts
 */
function getOwnerPayouts(req, res, next) {
  try {
    const ownerId = req.user.user_id;
    const payouts = db.prepare(`
      SELECT op.*, b.total_amount, b.created_at AS booking_date,
             v.name AS vehicle_name, v.brand AS vehicle_brand, v.registration_number
      FROM owner_payouts op
      JOIN bookings b ON op.booking_id = b.booking_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE op.owner_id = ?
      ORDER BY op.payout_id DESC
    `).all(ownerId);

    res.json(payouts);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOwnerProfile,
  saveOwnerProfile,
  addOwnerVehicle,
  getOwnerVehicles,
  getOwnerVehicleDetails,
  toggleVehicleAvailability,
  getOwnerBookings,
  markCodReceived,
  getOwnerDashboard,
  getOwnerPayouts
};
