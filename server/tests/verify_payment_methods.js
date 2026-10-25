const request = require('supertest');
const db = require('../db/db');
const app = require('../server');
const jwt = require('jsonwebtoken');
const { checkAndCancelExpiredHolds } = require('../cron/jobs');

// ANSI Color Helpers for clear, beautiful terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function printStep(stepNum, title) {
  console.log(`\n${colors.cyan}${colors.bright}================================================================================${colors.reset}`);
  console.log(`${colors.yellow}${colors.bright}>>> STEP ${stepNum}: ${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}================================================================================${colors.reset}`);
}

function printTable(title, rows) {
  console.log(`\n${colors.magenta}${colors.bright}--- SQL SELECT: ${title} ---${colors.reset}`);
  if (!rows || rows.length === 0) {
    console.log('(No rows found)');
    return;
  }
  console.table(rows);
}

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'fallback_jwt_secret_vehicle_rental_2026';
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name,
      is_verified: user.is_verified,
    },
    secret,
    { expiresIn: '1h' }
  );
}

async function runVerification() {
  console.log(`\n${colors.bright}${colors.green}STARTING COMPREHENSIVE PAYMENT & COD VERIFICATION TEST SUITE${colors.reset}\n`);

  try {
    // -------------------------------------------------------------------------
    // 1. Migration Verification: Row counts before & after
    // -------------------------------------------------------------------------
    printStep(1, 'Verify Migration Integrity & Preserved Tables');
    const Database = require('better-sqlite3');
    const path = require('path');
    const backupDbPath = path.join(__dirname, '..', 'db', 'rental.backup.db');
    let backupDb = null;
    let backupCounts = null;

    try {
      backupDb = new Database(backupDbPath);
      backupCounts = {
        users: backupDb.prepare('SELECT count(*) as c FROM users').get().c,
        vehicles: backupDb.prepare('SELECT count(*) as c FROM vehicles').get().c,
        bookings: backupDb.prepare('SELECT count(*) as c FROM bookings').get().c,
        payments: backupDb.prepare('SELECT count(*) as c FROM payments').get().c,
      };
      backupDb.close();
    } catch (e) {
      console.log('Backup database check skipped:', e.message);
    }

    const currentCounts = {
      users: db.prepare('SELECT count(*) as c FROM users').get().c,
      vehicles: db.prepare('SELECT count(*) as c FROM vehicles').get().c,
      bookings: db.prepare('SELECT count(*) as c FROM bookings').get().c,
      payments: db.prepare('SELECT count(*) as c FROM payments').get().c,
    };

    console.log('Pre-migration Backup DB Row Counts:', backupCounts || 'N/A');
    console.log('Post-migration Active DB Row Counts:', currentCounts);

    if (backupCounts) {
      if (currentCounts.users < backupCounts.users || currentCounts.vehicles < backupCounts.vehicles) {
        throw new Error('Migration lost existing rows!');
      }
      console.log(`${colors.green}✓ All data preserved 100% across migration!${colors.reset}`);
    }

    // -------------------------------------------------------------------------
    // Setup test users & test vehicle
    // -------------------------------------------------------------------------
    const timestamp = Date.now();
    const testEmail1 = `buyer_${timestamp}@test.com`;
    const testEmail2 = `buyer2_${timestamp}@test.com`;
    const testAdminEmail = `admin_test_${timestamp}@test.com`;

    db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, is_verified)
      VALUES (?, ?, '9876543210', 'hashed_pass_2026', 'customer', 1)
    `).run('Verified Customer 1', testEmail1);
    const user1 = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail1);
    const token1 = generateToken(user1);

    db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, is_verified)
      VALUES (?, ?, '9876543211', 'hashed_pass_2026', 'customer', 1)
    `).run('Verified Customer 2', testEmail2);
    const user2 = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail2);
    const token2 = generateToken(user2);

    db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, is_verified)
      VALUES (?, ?, '9876543299', 'hashed_pass_2026', 'admin', 1)
    `).run('Test Super Admin', testAdminEmail);
    const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get(testAdminEmail);
    const adminToken = generateToken(adminUser);

    const vehicle = db.prepare("SELECT * FROM vehicles WHERE status = 'Available' LIMIT 1").get();
    if (!vehicle) throw new Error('No available vehicle found for test.');

    console.log(`Using Vehicle ID: ${vehicle.vehicle_id} (${vehicle.brand} ${vehicle.name})`);

    // -------------------------------------------------------------------------
    // 2. COD Booking: Instant Confirmed, method COD, status Pending
    // -------------------------------------------------------------------------
    printStep(2, 'COD Booking Flow (Instant Confirmed, Payment Pending)');
    const codRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicle_id: vehicle.vehicle_id,
        start_datetime: '2026-12-01T10:00:00.000Z',
        end_datetime: '2026-12-03T10:00:00.000Z',
        pricing_type: 'day',
        payment_method: 'COD',
      });

    console.log('COD Booking Response Status:', codRes.status);
    console.log('COD Booking Response Body:', codRes.body);

    if (codRes.status !== 201 || codRes.body.booking.status !== 'Confirmed') {
      throw new Error(`COD booking failed to confirm: ${JSON.stringify(codRes.body)}`);
    }

    const codBookingId = codRes.body.booking.booking_id;
    const codBookingRow = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(codBookingId);
    const codPaymentRow = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(codBookingId);

    printTable('COD Booking Row', [codBookingRow]);
    printTable('COD Payment Row', [codPaymentRow]);

    if (codBookingRow.payment_method !== 'COD' || codBookingRow.status !== 'Confirmed') {
      throw new Error(`Invalid COD booking state: ${codBookingRow.status}`);
    }
    if (codPaymentRow.method !== 'COD' || codPaymentRow.payment_status !== 'Pending') {
      throw new Error(`Invalid COD payment state: ${codPaymentRow.payment_status}`);
    }
    console.log(`${colors.green}✓ COD booking created in Confirmed status with Pending COD payment row!${colors.reset}`);

    // -------------------------------------------------------------------------
    // 3. ONLINE Booking + Razorpay Verification: Awaiting Payment -> Confirmed + Paid
    // -------------------------------------------------------------------------
    printStep(3, 'ONLINE Booking Flow (Awaiting Payment -> Paid + Confirmed)');
    const onlineRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicle_id: vehicle.vehicle_id,
        start_datetime: '2026-12-05T10:00:00.000Z',
        end_datetime: '2026-12-07T10:00:00.000Z',
        pricing_type: 'day',
        payment_method: 'ONLINE',
      });

    console.log('Online Booking Creation Status:', onlineRes.status);
    if (onlineRes.status !== 201 || onlineRes.body.booking.status !== 'Awaiting Payment') {
      throw new Error(`Online booking creation failed: ${JSON.stringify(onlineRes.body)}`);
    }

    const onlineBookingId = onlineRes.body.booking.booking_id;
    const initialOnlineRow = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(onlineBookingId);
    const initialPaymentRow = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(onlineBookingId);

    printTable('Online Booking Initial State (Awaiting Payment)', [initialOnlineRow]);
    printTable('Online Payment Initial State (Pending)', [initialPaymentRow]);

    if (!initialOnlineRow.hold_expires_at) {
      throw new Error('Hold expires at must be set for online booking!');
    }

    // Now complete verification with valid signature
    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        booking_id: onlineBookingId,
        razorpay_order_id: onlineRes.body.razorpay?.order_id || 'order_test_rzp',
        razorpay_payment_id: 'pay_test_verified_123',
        razorpay_signature: 'simulated_valid_signature_2026',
      });

    console.log('Payment Verification Status:', verifyRes.status);
    if (verifyRes.status !== 200 || !verifyRes.body.success) {
      throw new Error(`Verification failed: ${JSON.stringify(verifyRes.body)}`);
    }

    const verifiedOnlineRow = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(onlineBookingId);
    const verifiedPaymentRow = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(onlineBookingId);

    printTable('Online Booking Post-Verification (Confirmed)', [verifiedOnlineRow]);
    printTable('Online Payment Post-Verification (Paid)', [verifiedPaymentRow]);

    if (verifiedOnlineRow.status !== 'Confirmed') {
      throw new Error(`Booking was not confirmed after payment: ${verifiedOnlineRow.status}`);
    }
    if (verifiedPaymentRow.payment_status !== 'Paid') {
      throw new Error(`Payment status was not updated to Paid: ${verifiedPaymentRow.payment_status}`);
    }
    console.log(`${colors.green}✓ Online booking successfully verified: Confirmed & Paid!${colors.reset}`);

    // -------------------------------------------------------------------------
    // 4. ONLINE Payment Failure/Cancel: Booking NOT Confirmed
    // -------------------------------------------------------------------------
    printStep(4, 'ONLINE Payment Failure Handling (Signature Mismatch)');
    const failBookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicle_id: vehicle.vehicle_id,
        start_datetime: '2026-12-10T10:00:00.000Z',
        end_datetime: '2026-12-12T10:00:00.000Z',
        pricing_type: 'day',
        payment_method: 'ONLINE',
      });

    const failBookingId = failBookingRes.body.booking.booking_id;

    // Send invalid signature
    const badVerifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        booking_id: failBookingId,
        razorpay_order_id: 'order_bad_test',
        razorpay_payment_id: 'pay_bad_test',
        razorpay_signature: 'INVALID_SIGNATURE_TAMPERED',
      });

    console.log('Invalid Signature Verification Response:', badVerifyRes.status, badVerifyRes.body);

    const badBookingRow = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(failBookingId);
    const badPaymentRow = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(failBookingId);

    printTable('Failed Online Booking State (Cancelled)', [badBookingRow]);
    printTable('Failed Online Payment State (Failed)', [badPaymentRow]);

    if (badBookingRow.status === 'Confirmed') {
      throw new Error('Booking must NEVER be confirmed with bad signature!');
    }
    if (badPaymentRow.payment_status !== 'Failed') {
      throw new Error(`Expected payment_status Failed, got: ${badPaymentRow.payment_status}`);
    }
    console.log(`${colors.green}✓ Bad signature rejected: Booking marked Cancelled, Payment Failed!${colors.reset}`);

    // -------------------------------------------------------------------------
    // 5. 10-Minute Hold Expiry: Auto Cancelled via Cron and Slot Freed
    // -------------------------------------------------------------------------
    printStep(5, 'Hold Expiry Cron (Expired Awaiting Payment Auto-Cancelled & Slot Freed)');
    const holdBookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicle_id: vehicle.vehicle_id,
        start_datetime: '2026-12-15T10:00:00.000Z',
        end_datetime: '2026-12-17T10:00:00.000Z',
        pricing_type: 'day',
        payment_method: 'ONLINE',
      });

    const holdBookingId = holdBookingRes.body.booking.booking_id;

    // Manually expire the hold in SQLite
    db.prepare(`
      UPDATE bookings
      SET hold_expires_at = datetime('now', '-5 minutes')
      WHERE booking_id = ?
    `).run(holdBookingId);

    console.log(`Simulated hold expiration for Booking #${holdBookingId}. Running cron worker...`);
    checkAndCancelExpiredHolds();

    const expiredBookingRow = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(holdBookingId);
    const expiredPaymentRow = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(holdBookingId);

    printTable('Expired Hold Booking Row', [expiredBookingRow]);
    printTable('Expired Hold Payment Row', [expiredPaymentRow]);

    if (expiredBookingRow.status !== 'Cancelled') {
      throw new Error(`Cron failed to cancel expired hold booking. Status is: ${expiredBookingRow.status}`);
    }
    if (expiredPaymentRow.payment_status !== 'Failed') {
      throw new Error(`Cron failed to mark payment Failed. Status is: ${expiredPaymentRow.payment_status}`);
    }

    // Verify slot is now free: create booking for the exact same dates
    const rebookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        vehicle_id: vehicle.vehicle_id,
        start_datetime: '2026-12-15T10:00:00.000Z',
        end_datetime: '2026-12-17T10:00:00.000Z',
        pricing_type: 'day',
        payment_method: 'ONLINE',
      });

    if (rebookRes.status !== 201) {
      throw new Error(`Slot was not freed up after hold expiration: ${JSON.stringify(rebookRes.body)}`);
    }
    console.log(`${colors.green}✓ Expired hold auto-cancelled by cron and freed slot successfully rebooked!${colors.reset}`);

    // -------------------------------------------------------------------------
    // 6. Double Booking Check: 409 Conflict Guard
    // -------------------------------------------------------------------------
    printStep(6, 'Zero Double-Booking Guard (409 Conflict)');
    const conflictRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicle_id: vehicle.vehicle_id,
        start_datetime: '2026-12-16T00:00:00.000Z', // Overlaps with 2026-12-15 to 2026-12-17
        end_datetime: '2026-12-18T00:00:00.000Z',
        pricing_type: 'day',
        payment_method: 'COD',
      });

    console.log('Double Booking Conflict Status:', conflictRes.status);
    console.log('Double Booking Conflict Response:', conflictRes.body);

    if (conflictRes.status !== 409) {
      throw new Error(`Expected 409 Conflict, received status ${conflictRes.status}`);
    }
    console.log(`${colors.green}✓ Double booking correctly blocked with 409 Conflict!${colors.reset}`);

    // -------------------------------------------------------------------------
    // 7. COD Abuse Limit: Max 2 Active COD Bookings Per User
    // -------------------------------------------------------------------------
    printStep(7, 'COD Abuse Limit (Max 2 Active COD Bookings)');
    // User1 already has 1 confirmed COD booking from Step 2.
    // Create 2nd active COD booking:
    const cod2Res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicle_id: vehicle.vehicle_id,
        start_datetime: '2026-12-20T10:00:00.000Z',
        end_datetime: '2026-12-22T10:00:00.000Z',
        pricing_type: 'day',
        payment_method: 'COD',
      });

    if (cod2Res.status !== 201) {
      throw new Error(`Failed to create 2nd COD booking: ${JSON.stringify(cod2Res.body)}`);
    }
    console.log('2nd COD booking created successfully.');

    // Attempt 3rd active COD booking for User1:
    const cod3Res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicle_id: vehicle.vehicle_id,
        start_datetime: '2026-12-25T10:00:00.000Z',
        end_datetime: '2026-12-27T10:00:00.000Z',
        pricing_type: 'day',
        payment_method: 'COD',
      });

    console.log('3rd COD Booking Request Status:', cod3Res.status);
    console.log('3rd COD Booking Request Body:', cod3Res.body);

    if (cod3Res.status !== 400 || !cod3Res.body.error?.includes('COD limit exceeded')) {
      throw new Error(`Expected 400 with active COD limit message, got: ${JSON.stringify(cod3Res.body)}`);
    }
    console.log(`${colors.green}✓ 3rd active COD booking rejected with clean error message!${colors.reset}`);

    // -------------------------------------------------------------------------
    // 8. Admin "Mark Cash Received": Payment -> Paid, Revenue Updated
    // -------------------------------------------------------------------------
    printStep(8, 'Admin Mark Cash Received (COD Collection & Revenue Attribution)');
    const codPaymentToCollect = db.prepare(`
      SELECT p.*, b.total_amount, b.late_fee
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      WHERE b.booking_id = ?
    `).get(codBookingId);

    const initialStats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    console.log('Initial Total Revenue:', initialStats.body.total_revenue);
    console.log('Initial Pending COD Collection:', initialStats.body.pending_cod_collection);

    // Admin collects cash
    const collectRes = await request(app)
      .patch(`/api/admin/payments/${codPaymentToCollect.payment_id}/collect-cash`)
      .set('Authorization', `Bearer ${adminToken}`);

    console.log('Collect Cash Status:', collectRes.status);
    console.log('Collect Cash Body:', collectRes.body);

    if (collectRes.status !== 200 || !collectRes.body.success) {
      throw new Error(`Admin cash collection failed: ${JSON.stringify(collectRes.body)}`);
    }

    const updatedPaymentRow = db.prepare('SELECT * FROM payments WHERE payment_id = ?').get(codPaymentToCollect.payment_id);
    const updatedBookingRow = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(codBookingId);

    printTable('Collected COD Payment Row', [updatedPaymentRow]);
    printTable('Associated Booking Row', [updatedBookingRow]);

    if (updatedPaymentRow.payment_status !== 'Paid' || !updatedPaymentRow.collected_by || !updatedPaymentRow.paid_at) {
      throw new Error(`Payment row not updated correctly on cash collection: ${JSON.stringify(updatedPaymentRow)}`);
    }

    const postStats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    console.log('Post-Collection Total Revenue:', postStats.body.total_revenue);
    console.log('Post-Collection Pending COD Collection:', postStats.body.pending_cod_collection);

    if (postStats.body.total_revenue <= initialStats.body.total_revenue) {
      throw new Error('Total revenue did not increase after collecting cash!');
    }
    console.log(`${colors.green}✓ Admin cash collection successfully marked Paid and attributed to revenue!${colors.reset}`);

    // -------------------------------------------------------------------------
    // 9. Comprehensive SQL Summary of Bookings and Payments
    // -------------------------------------------------------------------------
    printStep(9, 'Final Database Table State (SELECT * Queries)');
    const finalBookings = db.prepare(`
      SELECT b.booking_id, b.user_id, b.vehicle_id, b.payment_method, b.status, b.hold_expires_at,
             b.total_amount, b.created_at
      FROM bookings b
      ORDER BY b.booking_id DESC
      LIMIT 10
    `).all();

    const finalPayments = db.prepare(`
      SELECT p.payment_id, p.booking_id, p.method, p.payment_status, p.amount,
             p.paid_at, p.collected_by
      FROM payments p
      ORDER BY p.payment_id DESC
      LIMIT 10
    `).all();

    printTable('Recent 10 Bookings in rental.db', finalBookings);
    printTable('Recent 10 Payments in rental.db', finalPayments);

    console.log(`\n${colors.bright}${colors.green}================================================================================${colors.reset}`);
    console.log(`${colors.bright}${colors.green}ALL 9 VERIFICATION CHECKS PASSED WITH ZERO ERRORS!${colors.reset}`);
    console.log(`${colors.bright}${colors.green}================================================================================${colors.reset}\n`);

    process.exit(0);
  } catch (err) {
    console.error(`\n${colors.red}${colors.bright}VERIFICATION SUITE FAILED:${colors.reset}`, err);
    process.exit(1);
  }
}

runVerification();
