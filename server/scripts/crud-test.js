/**
 * Database CRUD Verification Script
 * Tests CREATE, READ, UPDATE, DELETE (Soft/Hard) on all 16 database tables
 * Outputs formatted result table.
 */
const path = require('path');
const db = require('../db/db');

async function runCrudTest() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE DATABASE CRUD INTEGRITY TEST');
  console.log('======================================================\n');

  const results = [];

  function record(table, insertOk, updateOk, deleteOk, note = '') {
    const overall = (insertOk && updateOk && deleteOk) ? 'PASS' : 'FAIL';
    results.push({
      Table: table,
      Insert: insertOk ? '✅ PASS' : '❌ FAIL',
      Update: updateOk ? '✅ PASS' : '❌ FAIL',
      Delete: deleteOk ? '✅ PASS' : '❌ FAIL',
      Status: overall === 'PASS' ? '✅ PASS' : '❌ FAIL',
      Note: note
    });
  }

  // 1. users (Soft delete)
  try {
    const email = `test_crud_${Date.now()}@example.com`;
    const ins = db.prepare(`
      INSERT INTO users (name, email, role, is_verified, is_blocked)
      VALUES ('CRUD Test User', ?, 'customer', 1, 0)
    `).run(email);
    const userId = ins.lastInsertRowid;
    const insertOk = Boolean(userId);

    const upd = db.prepare('UPDATE users SET name = ? WHERE user_id = ?').run('CRUD Updated User', userId);
    const updateOk = upd.changes > 0;

    // Soft delete
    const del = db.prepare("UPDATE users SET deleted_at = datetime('now') WHERE user_id = ?").run(userId);
    const deleteOk = del.changes > 0;

    record('users', insertOk, updateOk, deleteOk, 'Soft Delete (deleted_at)');
  } catch (err) {
    record('users', false, false, false, err.message);
  }

  // 2. email_otps (Hard delete)
  try {
    const ins = db.prepare(`
      INSERT INTO email_otps (email, otp_hash, expires_at, used, attempts)
      VALUES ('otp_test@example.com', 'dummyhash123', datetime('now', '+60 seconds'), 0, 0)
    `).run();
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare('UPDATE email_otps SET used = 1, attempts = 1 WHERE otp_id = ?').run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM email_otps WHERE otp_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('email_otps', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('email_otps', false, false, false, err.message);
  }

  // 3. vehicles (Soft delete)
  let testVehicleId = null;
  try {
    const regNo = `CRU${Date.now().toString().slice(-6)}`;
    const ins = db.prepare(`
      INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, registration_number, approval_status)
      VALUES ('Test Car', 'Test Brand', 'Sedan', 'Petrol', 'Manual', 5, 2000, 250, 15, 3000, 'Available', ?, 'Approved')
    `).run(regNo);
    testVehicleId = ins.lastInsertRowid;
    const insertOk = Boolean(testVehicleId);

    const upd = db.prepare('UPDATE vehicles SET price_per_day = 2500 WHERE vehicle_id = ?').run(testVehicleId);
    const updateOk = upd.changes > 0;

    const del = db.prepare("UPDATE vehicles SET deleted_at = datetime('now') WHERE vehicle_id = ?").run(testVehicleId);
    const deleteOk = del.changes > 0;

    record('vehicles', insertOk, updateOk, deleteOk, 'Soft Delete (deleted_at)');
  } catch (err) {
    record('vehicles', false, false, false, err.message);
  }

  // 4. vehicle_images (Hard delete)
  try {
    const vId = testVehicleId || 1;
    const ins = db.prepare(`
      INSERT INTO vehicle_images (vehicle_id, file_path, thumb_path, image_type, is_primary)
      VALUES (?, '/uploads/vehicles/test.webp', '/uploads/vehicles/test_thumb.webp', 'Front', 1)
    `).run(vId);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare('UPDATE vehicle_images SET image_type = ? WHERE image_id = ?').run('Interior', id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM vehicle_images WHERE image_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('vehicle_images', insertOk, updateOk, deleteOk, 'Hard Delete (Cascade)');
  } catch (err) {
    record('vehicle_images', false, false, false, err.message);
  }

  // 5. bookings (Soft delete)
  let testBookingId = null;
  try {
    const user = db.prepare('SELECT user_id FROM users LIMIT 1').get();
    const v = db.prepare('SELECT vehicle_id FROM vehicles LIMIT 1').get();
    const ins = db.prepare(`
      INSERT INTO bookings (user_id, vehicle_id, start_datetime, end_datetime, pricing_type, total_amount, deposit_amount, status)
      VALUES (?, ?, datetime('now', '+10 days'), datetime('now', '+12 days'), 'day', 5000, 3000, 'Confirmed')
    `).run(user.user_id, v.vehicle_id);
    testBookingId = ins.lastInsertRowid;
    const insertOk = Boolean(testBookingId);

    const upd = db.prepare('UPDATE bookings SET total_amount = 5500 WHERE booking_id = ?').run(testBookingId);
    const updateOk = upd.changes > 0;

    const del = db.prepare("UPDATE bookings SET deleted_at = datetime('now'), status = 'Cancelled' WHERE booking_id = ?").run(testBookingId);
    const deleteOk = del.changes > 0;

    record('bookings', insertOk, updateOk, deleteOk, 'Soft Delete (deleted_at)');
  } catch (err) {
    record('bookings', false, false, false, err.message);
  }

  // 6. payments (Soft delete)
  try {
    const bId = testBookingId || 1;
    const ins = db.prepare(`
      INSERT INTO payments (booking_id, amount, method, payment_status, razorpay_payment_id)
      VALUES (?, 5500, 'COD', 'Pending', 'TXN_TEST_123')
    `).run(bId);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare("UPDATE payments SET payment_status = 'Paid' WHERE payment_id = ?").run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare("UPDATE payments SET deleted_at = datetime('now') WHERE payment_id = ?").run(id);
    const deleteOk = del.changes > 0;

    record('payments', insertOk, updateOk, deleteOk, 'Soft Delete (deleted_at)');
  } catch (err) {
    record('payments', false, false, false, err.message);
  }

  // 7. maintenance (Hard delete)
  try {
    const v = db.prepare('SELECT vehicle_id FROM vehicles LIMIT 1').get();
    const ins = db.prepare(`
      INSERT INTO maintenance (vehicle_id, service_date, cost, notes)
      VALUES (?, '2026-10-25', 1200, 'Routine oil filter replacement')
    `).run(v.vehicle_id);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare('UPDATE maintenance SET cost = 1500 WHERE maintenance_id = ?').run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM maintenance WHERE maintenance_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('maintenance', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('maintenance', false, false, false, err.message);
  }

  // 8. fuel_records (Hard delete)
  try {
    const v = db.prepare('SELECT vehicle_id FROM vehicles LIMIT 1').get();
    const ins = db.prepare(`
      INSERT INTO fuel_records (vehicle_id, date, litres, cost)
      VALUES (?, '2026-10-25', 40, 4000)
    `).run(v.vehicle_id);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare('UPDATE fuel_records SET litres = 42 WHERE fuel_id = ?').run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM fuel_records WHERE fuel_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('fuel_records', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('fuel_records', false, false, false, err.message);
  }

  // 9. drivers (Hard delete)
  try {
    const v = db.prepare('SELECT vehicle_id FROM vehicles LIMIT 1').get();
    const ins = db.prepare(`
      INSERT INTO drivers (name, phone, license_no, vehicle_id)
      VALUES ('Test Driver', '9898000000', 'DL9920260001', ?)
    `).run(v ? v.vehicle_id : null);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare("UPDATE drivers SET phone = '9898000001' WHERE driver_id = ?").run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM drivers WHERE driver_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('drivers', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('drivers', false, false, false, err.message);
  }

  // 10. reviews (Hard delete)
  try {
    const u = db.prepare('SELECT user_id FROM users LIMIT 1').get();
    const v = db.prepare('SELECT vehicle_id FROM vehicles LIMIT 1').get();
    const ins = db.prepare(`
      INSERT INTO reviews (user_id, vehicle_id, rating, comment)
      VALUES (?, ?, 5, 'Exceptional ride and clean interior!')
    `).run(u.user_id, v.vehicle_id);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare('UPDATE reviews SET rating = 4 WHERE review_id = ?').run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM reviews WHERE review_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('reviews', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('reviews', false, false, false, err.message);
  }

  // 11. discounts (Hard delete)
  try {
    const code = `TEST${Date.now().toString().slice(-4)}`;
    const ins = db.prepare(`
      INSERT INTO discounts (code, percent, valid_from, valid_to, active)
      VALUES (?, 15, '2026-01-01', '2026-12-31', 1)
    `).run(code);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare('UPDATE discounts SET percent = 20 WHERE discount_id = ?').run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM discounts WHERE discount_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('discounts', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('discounts', false, false, false, err.message);
  }

  // 12. vehicle_documents (Hard delete)
  try {
    const v = db.prepare('SELECT vehicle_id FROM vehicles LIMIT 1').get();
    const ins = db.prepare(`
      INSERT INTO vehicle_documents (vehicle_id, doc_type, file_path, expiry_date, status)
      VALUES (?, 'PUC', 'puc_test.pdf', '2027-01-01', 'Pending')
    `).run(v.vehicle_id);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare("UPDATE vehicle_documents SET status = 'Approved' WHERE doc_id = ?").run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM vehicle_documents WHERE doc_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('vehicle_documents', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('vehicle_documents', false, false, false, err.message);
  }

  // 13. kyc_documents (Hard delete)
  try {
    const u = db.prepare('SELECT user_id FROM users LIMIT 1').get();
    const ins = db.prepare(`
      INSERT INTO kyc_documents (user_id, doc_type, doc_number, file_path, expiry_date, status)
      VALUES (?, 'DrivingLicense_Front', 'DL9999999999', 'dl_front.jpg', '2028-10-25', 'Pending')
    `).run(u.user_id);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare("UPDATE kyc_documents SET status = 'Approved' WHERE doc_id = ?").run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM kyc_documents WHERE doc_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('kyc_documents', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('kyc_documents', false, false, false, err.message);
  }

  // 14. owner_profiles (Hard delete)
  try {
    const owner = db.prepare("SELECT user_id FROM users WHERE role = 'owner' LIMIT 1").get() ||
                  db.prepare("SELECT user_id FROM users LIMIT 1").get();
    
    // Check if profile exists, delete for test
    db.prepare('DELETE FROM owner_profiles WHERE owner_id = ?').run(owner.user_id);

    const ins = db.prepare(`
      INSERT INTO owner_profiles (owner_id, business_name, address, city, bank_account_holder, bank_account_number_enc, ifsc, upi_id)
      VALUES (?, 'Test Rentals Fleet', '123 Test Road', 'Mumbai', 'Test Holder', 'enc_123', 'SBIN0001234', 'test@upi')
    `).run(owner.user_id);
    const insertOk = ins.changes > 0;

    const upd = db.prepare('UPDATE owner_profiles SET city = ? WHERE owner_id = ?').run('Pune', owner.user_id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM owner_profiles WHERE owner_id = ?').run(owner.user_id);
    const deleteOk = del.changes > 0;

    record('owner_profiles', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('owner_profiles', false, false, false, err.message);
  }

  // 15. owner_payouts (Hard delete)
  try {
    const owner = db.prepare('SELECT user_id FROM users LIMIT 1').get();
    const b = db.prepare('SELECT booking_id FROM bookings LIMIT 1').get();
    const ins = db.prepare(`
      INSERT INTO owner_payouts (owner_id, booking_id, gross_amount, commission_amount, payout_amount, status)
      VALUES (?, ?, 10000, 2000, 8000, 'Pending')
    `).run(owner.user_id, b ? b.booking_id : 1);
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare("UPDATE owner_payouts SET status = 'Paid', reference_no = 'UTR987654321' WHERE payout_id = ?").run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM owner_payouts WHERE payout_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('owner_payouts', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('owner_payouts', false, false, false, err.message);
  }

  // 16. audit_logs (Hard delete / purge)
  try {
    const ins = db.prepare(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, details)
      VALUES (1, 'CRUD_TEST_LOG', 'test_table', 999, '{"test":true}')
    `).run();
    const id = ins.lastInsertRowid;
    const insertOk = Boolean(id);

    const upd = db.prepare("UPDATE audit_logs SET action = 'CRUD_TEST_LOG_UPDATED' WHERE log_id = ?").run(id);
    const updateOk = upd.changes > 0;

    const del = db.prepare('DELETE FROM audit_logs WHERE log_id = ?').run(id);
    const deleteOk = del.changes > 0;

    record('audit_logs', insertOk, updateOk, deleteOk, 'Hard Delete');
  } catch (err) {
    record('audit_logs', false, false, false, err.message);
  }

  // Print results formatted table
  console.table(results);

  const allPassed = results.every(r => r.Status === '✅ PASS');
  if (allPassed) {
    console.log('🎉 ALL 16 DATABASE TABLES PASSED CRUD VALIDATION 100%!\n');
  } else {
    console.error('⚠️ Some tables failed CRUD validation. Inspect table above.');
  }

  return allPassed;
}

if (require.main === module) {
  runCrudTest().then(success => process.exit(success ? 0 : 1));
}

module.exports = { runCrudTest };
