const db = require('../db/db');
const { generateFleetReportExcel } = require('../utils/excelExport');
const PDFDocument = require('pdfkit');

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

    const activeRentals = db.prepare(`
      SELECT count(*) as count FROM bookings
      WHERE status IN ('Active', 'Approved')
    `).get().count;

    const totalCustomers = db.prepare("SELECT count(*) as count FROM users WHERE role = 'customer'").get().count;

    res.json({
      total_vehicles: totalVehicles,
      available_vehicles: available,
      rented_vehicles: rented,
      in_service_vehicles: inService,
      todays_bookings: todaysBookings,
      total_revenue: revenueResult.total_revenue,
      active_rentals: activeRentals,
      total_customers: totalCustomers
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

module.exports = {
  getStats,
  getRevenueReport,
  getMostBooked,
  getIdleVehicles,
  getCustomersReport,
  exportReport
};
