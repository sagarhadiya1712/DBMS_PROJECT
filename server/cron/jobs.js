const cron = require('node-cron');
const db = require('../db/db');

function runDailyFleetInspection() {
  console.log('⏰ [CRON JOB] Running scheduled daily fleet inspection & expiry scan...');

  try {
    // 1. Scan for overdue bookings (scheduled end has passed but still Active)
    const overdueBookings = db.prepare(`
      SELECT b.booking_id, b.user_id, b.vehicle_id, b.end_datetime,
        u.name AS customer_name, v.name AS vehicle_name
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      JOIN vehicles v ON b.vehicle_id = v.vehicle_id
      WHERE b.status = 'Active' AND datetime(b.end_datetime) < datetime('now')
    `).all();

    if (overdueBookings.length > 0) {
      console.warn(`⚠️ [CRON WARNING] Found ${overdueBookings.length} overdue active bookings:`);
      overdueBookings.forEach(b => {
        console.warn(`   - Booking #${b.booking_id}: ${b.customer_name} with ${b.vehicle_name} (Due: ${b.end_datetime})`);
      });
    } else {
      console.log('   ✅ No overdue bookings found.');
    }

    // 2. Scan for expiring vehicle documents and insurance (within 15 days)
    const expiringInsurance = db.prepare(`
      SELECT vehicle_id, name, brand, insurance_expiry
      FROM vehicles
      WHERE insurance_expiry IS NOT NULL
        AND julianday(insurance_expiry) - julianday('now') BETWEEN 0 AND 15
    `).all();

    const expiringPermits = db.prepare(`
      SELECT vehicle_id, name, brand, permit_expiry
      FROM vehicles
      WHERE permit_expiry IS NOT NULL
        AND julianday(permit_expiry) - julianday('now') BETWEEN 0 AND 15
    `).all();

    const expiringServices = db.prepare(`
      SELECT m.vehicle_id, v.name, v.brand, m.next_due_date
      FROM maintenance m
      JOIN vehicles v ON m.vehicle_id = v.vehicle_id
      WHERE m.next_due_date IS NOT NULL
        AND julianday(m.next_due_date) - julianday('now') BETWEEN 0 AND 15
    `).all();

    const totalAlerts = expiringInsurance.length + expiringPermits.length + expiringServices.length;
    console.log(`   📋 Fleet Health: ${totalAlerts} items require administrative attention within 15 days.`);
  } catch (err) {
    console.error('❌ Error executing cron daily inspection:', err.message);
  }
}

function initCronJobs() {
  // Run once on server startup
  runDailyFleetInspection();

  // Schedule daily at 00:00 midnight
  cron.schedule('0 0 * * *', () => {
    runDailyFleetInspection();
  });

  console.log('🕒 Node-cron daily fleet inspection scheduled (0 0 * * *).');
}

module.exports = {
  initCronJobs,
  runDailyFleetInspection
};
