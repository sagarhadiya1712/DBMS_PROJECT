const db = require('../db/db');
const { generateFleetReportExcel } = require('../utils/excelExport');
const PDFDocument = require('pdfkit');
const { logAudit } = require('../utils/auditLogger');
const { sendVehicleApprovalEmail, sendVehicleRejectionEmail, sendPayoutPaidEmail } = require('../utils/emailService');

// GET /api/admin/stats
function getStats(req, res, next) {
  try {
    const totalVehicles = db.prepare('SELECT count(*) as count FROM vehicles').get().count;
    const available = db.prepare("SELECT count(*) as count FROM vehicles WHERE status = 'Available'").get().count;
    const rented = db.prepare("SELECT count(*) as count FROM vehicles WHERE status = 'Rented'").get().count;
    const inService = db.prepare("SELECT count(*) as count FROM vehicles WHERE status = 'In Service'").get().count;

    const todaysBookings = db.prepare(`
      SELECT count(*) as count FROM bookings
      WHERE date(created_at) = date('now')
    `).get().count;

    const revenueResult = db.prepare(`
      SELECT COALESCE(SUM(b.total_amount + b.late_fee), 0) AS total_revenue
      FROM bookings b
      JOIN payments p ON b.booking_id = p.booking_id
      WHERE p.payment_status = 'Paid'
    `).get();

    const pendingCodResult = db.prepare(`
      SELECT COALESCE(SUM(b.total_amount + b.late_fee), 0) AS pending_cod_amount,
             COUNT(b.booking_id) AS pending_cod_count
      FROM bookings b
      JOIN payments p ON b.booking_id = p.booking_id
      WHERE b.payment_method = 'COD' AND p.payment_status = 'Pending' AND b.status IN ('Confirmed', 'Active')
    `).get();

    const activeRentals = db.prepare(`
      SELECT count(*) as count FROM bookings
      WHERE status IN ('Active', 'Approved')
    `).get().count;

    const totalCustomers = db.prepare("SELECT count(*) as count FROM users WHERE role = 'customer' AND deleted_at IS NULL").get().count;
    const totalOwners = db.prepare("SELECT count(*) as count FROM users WHERE role = 'owner' AND deleted_at IS NULL").get().count;

    const pendingKycCount = db.prepare("SELECT count(*) as count FROM users WHERE kyc_status = 'Pending' AND deleted_at IS NULL").get().count;
    const pendingVehiclesCount = db.prepare("SELECT count(*) as count FROM vehicles WHERE approval_status = 'Pending Approval' AND deleted_at IS NULL").get().count;
    const pendingPayoutsCount = db.prepare("SELECT count(*) as count FROM owner_payouts WHERE status = 'Pending'").get().count;

    res.json({
      total_vehicles: totalVehicles,
      available_vehicles: available,
      rented_vehicles: rented,
      in_service_vehicles: inService,
      todays_bookings: todaysBookings,
      total_revenue: revenueResult.total_revenue,
      pending_cod_collection: pendingCodResult.pending_cod_amount,
      pending_cod_count: pendingCodResult.pending_cod_count,
      active_rentals: activeRentals,
      total_customers: totalCustomers,
      total_owners: totalOwners,
      pending_kyc: pendingKycCount,
      pending_vehicle_approvals: pendingVehiclesCount,
      pending_payouts: pendingPayoutsCount
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/revenue?range=daily|monthly
function getRevenueReport(req, res, next) {
  try {
    const { range } = req.query;
    let query;

    if (range === 'monthly') {
      query = `
        SELECT strftime('%Y-%m', b.created_at) AS period,
          COUNT(b.booking_id) AS bookings,
          COALESCE(SUM(b.total_amount + b.late_fee), 0) AS revenue
        FROM bookings b
        JOIN payments p ON b.booking_id = p.booking_id
        WHERE p.payment_status = 'Paid'
        GROUP BY period
        ORDER BY period ASC
        LIMIT 12
      `;
    } else {
      // Daily breakdown
      query = `
        SELECT strftime('%Y-%m-%d', b.created_at) AS period,
          COUNT(b.booking_id) AS bookings,
          COALESCE(SUM(b.total_amount + b.late_fee), 0) AS revenue
        FROM bookings b
        JOIN payments p ON b.booking_id = p.booking_id
        WHERE p.payment_status = 'Paid'
        GROUP BY period
        ORDER BY period ASC
        LIMIT 30
      `;
    }

    const data = db.prepare(query).all();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/most-booked
function getMostBooked(req, res, next) {
  try {
    const data = db.prepare(`
      SELECT v.vehicle_id, v.name, v.brand, v.category, v.price_per_day,
        COUNT(b.booking_id) AS booking_count,
        COALESCE(SUM(b.total_amount), 0) AS total_revenue
      FROM vehicles v
      LEFT JOIN bookings b ON v.vehicle_id = b.vehicle_id
      GROUP BY v.vehicle_id
      ORDER BY booking_count DESC, total_revenue DESC
      LIMIT 10
    `).all();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/idle-vehicles
function getIdleVehicles(req, res, next) {
  try {
    const data = db.prepare(`
      SELECT v.*,
        MAX(b.created_at) AS last_booked_at
      FROM vehicles v
      LEFT JOIN bookings b ON v.vehicle_id = b.vehicle_id
      GROUP BY v.vehicle_id
      HAVING last_booked_at IS NULL OR julianday('now') - julianday(last_booked_at) >= 7
      ORDER BY last_booked_at ASC
    `).all();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/customers
function getCustomersReport(req, res, next) {
  try {
    const data = db.prepare(`
      SELECT u.user_id, u.name, u.email, u.phone, u.is_blocked, u.created_at,
        COUNT(b.booking_id) AS total_bookings,
        COALESCE(SUM(b.total_amount), 0) AS total_spent
      FROM users u
      LEFT JOIN bookings b ON u.user_id = b.user_id
      WHERE u.role = 'customer'
      GROUP BY u.user_id
      ORDER BY total_spent DESC, total_bookings DESC
    `).all();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/export?type=pdf|excel
async function exportReport(req, res, next) {
  try {
    const { type } = req.query;

    // Gather report datasets
    const revenue = db.prepare(`
      SELECT strftime('%Y-%m-%d', b.created_at) AS period,
        COUNT(b.booking_id) AS bookings,
        COALESCE(SUM(b.total_amount + b.late_fee), 0) AS revenue
      FROM bookings b
      JOIN payments p ON b.booking_id = p.booking_id
      WHERE p.payment_status = 'Paid'
      GROUP BY period
      ORDER BY period ASC
    `).all();

    const mostBooked = db.prepare(`
      SELECT v.vehicle_id, v.name, v.brand, v.category,
        COUNT(b.booking_id) AS booking_count,
        COALESCE(SUM(b.total_amount), 0) AS total_revenue
      FROM vehicles v
      LEFT JOIN bookings b ON v.vehicle_id = b.vehicle_id
      GROUP BY v.vehicle_id
      ORDER BY booking_count DESC
    `).all();

    const idleVehicles = db.prepare(`
      SELECT v.* FROM vehicles v
      WHERE v.status = 'Available'
    `).all();

    const customers = db.prepare(`
      SELECT u.user_id, u.name, u.email, u.phone, u.is_blocked,
        COUNT(b.booking_id) AS total_bookings,
        COALESCE(SUM(b.total_amount), 0) AS total_spent
      FROM users u
      LEFT JOIN bookings b ON u.user_id = b.user_id
      WHERE u.role = 'customer'
      GROUP BY u.user_id
    `).all();

    if (type === 'excel') {
      const workbook = await generateFleetReportExcel({
        revenue,
        mostBooked,
        idleVehicles,
        customers
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Fleet-Analytics-Report.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    // Default to PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Fleet-Executive-Report.pdf');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 80).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text('FLEET MANAGEMENT EXECUTIVE REPORT', 40, 25);
    doc.fontSize(10).font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString('en-IN')}`, 40, 50);

    let y = 110;
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold')
      .text('Most Booked Fleet Assets', 40, y);

    y += 20;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
    doc.text('Vehicle', 40, y);
    doc.text('Category', 220, y);
    doc.text('Bookings', 340, y);
    doc.text('Revenue (INR)', 440, y, { align: 'right' });

    y += 15;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#cbd5e1').stroke();
    y += 8;

    doc.font('Helvetica').fillColor('#1e293b');
    mostBooked.slice(0, 8).forEach(v => {
      doc.text(`${v.brand} ${v.name}`, 40, y);
      doc.text(v.category, 220, y);
      doc.text(String(v.booking_count), 340, y);
      doc.text(`Rs. ${Number(v.total_revenue).toFixed(2)}`, 440, y, { align: 'right' });
      y += 18;
    });

    y += 30;
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold')
      .text('Customer Summary', 40, y);

    y += 20;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
    doc.text('Customer Name', 40, y);
    doc.text('Email', 180, y);
    doc.text('Bookings', 360, y);
    doc.text('Total Spent', 440, y, { align: 'right' });

    y += 15;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#cbd5e1').stroke();
    y += 8;

    doc.font('Helvetica').fillColor('#1e293b');
    customers.slice(0, 8).forEach(c => {
      doc.text(c.name, 40, y);
      doc.text(c.email, 180, y);
      doc.text(String(c.total_bookings), 360, y);
      doc.text(`Rs. ${Number(c.total_spent).toFixed(2)}`, 440, y, { align: 'right' });
      y += 18;
    });

    doc.end();
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/vehicles/pending
function getPendingVehicles(req, res, next) {
  try {
    const vehicles = db.prepare(`
      SELECT v.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone, u.kyc_status AS owner_kyc_status
      FROM vehicles v
      JOIN users u ON v.owner_id = u.user_id
      WHERE v.approval_status = 'Pending Approval' AND v.deleted_at IS NULL
      ORDER BY v.created_at DESC
    `).all();

    const withAssets = vehicles.map(v => {
      const photos = db.prepare('SELECT * FROM vehicle_images WHERE vehicle_id = ?').all(v.vehicle_id);
      const docs = db.prepare('SELECT * FROM vehicle_documents WHERE vehicle_id = ?').all(v.vehicle_id);
      return { ...v, photos, documents: docs };
    });

    res.json(withAssets);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/vehicles/:id/approval
function verifyVehicleApproval(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.user_id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
    }

    if (status === 'Rejected' && (!reason || reason.trim().length < 3)) {
      return res.status(400).json({ error: 'A specific rejection reason is required.' });
    }

    const vehicle = db.prepare(`
      SELECT v.*, u.email AS owner_email, u.name AS owner_name
      FROM vehicles v
      LEFT JOIN users u ON v.owner_id = u.user_id
      WHERE v.vehicle_id = ?
    `).get(id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE vehicles
        SET approval_status = ?, rejection_reason = ?, status = CASE WHEN ? = 'Approved' THEN 'Available' ELSE status END
        WHERE vehicle_id = ?
      `).run(status, status === 'Rejected' ? reason.trim() : null, status, id);

      logAudit(adminId, `VEHICLE_APPROVAL_${status.toUpperCase()}`, 'vehicles', id, {
        status,
        reason: reason || null,
        owner_id: vehicle.owner_id
      });
    })();

    // Email notification to owner
    if (vehicle.owner_email) {
      if (status === 'Approved') {
        sendVehicleApprovalEmail(vehicle.owner_email, vehicle.owner_name, `${vehicle.brand} ${vehicle.name}`).catch(() => {});
      } else {
        sendVehicleRejectionEmail(vehicle.owner_email, vehicle.owner_name, `${vehicle.brand} ${vehicle.name}`, reason).catch(() => {});
      }
    }

    res.json({
      message: `Vehicle listing has been ${status.toLowerCase()}.`,
      vehicle_id: id,
      approval_status: status
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/owners
function getAdminOwners(req, res, next) {
  try {
    const owners = db.prepare(`
      SELECT u.user_id, u.name, u.email, u.phone, u.kyc_status, u.is_blocked, u.created_at,
             op.business_name, op.city, op.ifsc, op.commission_percent,
             (SELECT count(*) FROM vehicles v WHERE v.owner_id = u.user_id AND v.deleted_at IS NULL) AS total_vehicles,
             (SELECT COALESCE(SUM(payout_amount), 0) FROM owner_payouts WHERE owner_id = u.user_id) AS total_earnings,
             (SELECT COALESCE(SUM(payout_amount), 0) FROM owner_payouts WHERE owner_id = u.user_id AND status = 'Pending') AS pending_payouts
      FROM users u
      LEFT JOIN owner_profiles op ON u.user_id = op.owner_id
      WHERE u.role = 'owner' AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `).all();

    res.json(owners);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/payouts
function getAdminPayouts(req, res, next) {
  try {
    const { status } = req.query;
    let query = `
      SELECT op.*,
             u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone,
             prf.bank_account_holder, prf.ifsc, prf.upi_id,
             b.total_amount, b.created_at AS booking_date,
             v.name AS vehicle_name, v.brand AS vehicle_brand, v.registration_number
      FROM owner_payouts op
      JOIN users u ON op.owner_id = u.user_id
      LEFT JOIN owner_profiles prf ON op.owner_id = prf.owner_id
      JOIN bookings b ON op.booking_id = b.booking_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND op.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY op.payout_id DESC`;

    const payouts = db.prepare(query).all(...params);
    res.json(payouts);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/payouts/:id/pay
function markPayoutPaid(req, res, next) {
  try {
    const { id } = req.params;
    const { reference_no } = req.body;
    const adminId = req.user.user_id;

    if (!reference_no || reference_no.trim().length < 3) {
      return res.status(400).json({ error: 'A valid bank transfer / UTR reference number is required.' });
    }

    const payout = db.prepare(`
      SELECT op.*, u.email AS owner_email, u.name AS owner_name
      FROM owner_payouts op
      JOIN users u ON op.owner_id = u.user_id
      WHERE op.payout_id = ?
    `).get(id);

    if (!payout) {
      return res.status(404).json({ error: 'Payout record not found.' });
    }

    if (payout.status === 'Paid') {
      return res.status(400).json({ error: 'This payout has already been marked as paid.' });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE owner_payouts
        SET status = 'Paid', paid_at = datetime('now'), reference_no = ?
        WHERE payout_id = ?
      `).run(reference_no.trim(), id);

      logAudit(adminId, 'MARK_PAYOUT_PAID', 'owner_payouts', id, {
        payout_amount: payout.payout_amount,
        reference_no: reference_no.trim()
      });
    })();

    // Email notification to owner
    sendPayoutPaidEmail(payout.owner_email, payout.owner_name, payout.payout_amount, reference_no.trim()).catch(() => {});

    res.json({
      message: 'Payout marked as successfully paid.',
      payout_id: id,
      status: 'Paid',
      reference_no: reference_no.trim()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  getRevenueReport,
  getMostBooked,
  getIdleVehicles,
  getCustomersReport,
  exportReport,
  getPendingVehicles,
  verifyVehicleApproval,
  getAdminOwners,
  getAdminPayouts,
  markPayoutPaid
};
