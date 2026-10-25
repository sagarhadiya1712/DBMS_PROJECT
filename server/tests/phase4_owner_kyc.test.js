const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../server');
const db = require('../db/db');
const { signToken } = require('../utils/jwt');

describe('Phase 4: Vehicle Owner Role & KYC Verification Comprehensive Suite', () => {
  let adminToken;
  let ownerAToken;
  let ownerBToken;
  let customerToken;
  let ownerAId;
  let ownerBId;
  let customerId;
  let ownerAVehicleId;

  beforeAll(() => {
    // 1. Admin token
    const admin = db.prepare("SELECT user_id, role FROM users WHERE role = 'admin' LIMIT 1").get();
    adminToken = signToken({ user_id: admin.user_id, role: admin.role });

    // 2. Setup Owner A
    const ownerA = db.prepare("SELECT user_id, role FROM users WHERE email = 'owner@example.com'").get();
    ownerAId = ownerA ? ownerA.user_id : null;
    ownerAToken = signToken({ user_id: ownerAId, role: 'owner' });

    // 3. Setup Owner B (isolated competitor owner)
    const insB = db.prepare(`
      INSERT INTO users (name, email, role, is_verified, is_blocked, kyc_status)
      VALUES ('Competitor Owner B', ?, 'owner', 1, 0, 'Approved')
    `).run(`owner_b_${Date.now()}@example.com`);
    ownerBId = insB.lastInsertRowid;
    ownerBToken = signToken({ user_id: ownerBId, role: 'owner' });

    // 4. Setup Customer with unapproved KYC
    const insCust = db.prepare(`
      INSERT INTO users (name, email, role, is_verified, is_blocked, kyc_status)
      VALUES ('Testing Customer', ?, 'customer', 1, 0, 'NotSubmitted')
    `).run(`kyc_test_cust_${Date.now()}@example.com`);
    customerId = insCust.lastInsertRowid;
    customerToken = signToken({ user_id: customerId, role: 'customer' });
  });

  // TEST 1: Customer without KYC blocked from booking (403)
  it('1. Customer without KYC cannot book vehicles (403 Pehle KYC complete karo)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicle_id: 1,
        start_datetime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        end_datetime: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000).toISOString()
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Pehle KYC complete karo/i);
  });

  // TEST 2: Customer with expired driving license blocked (403)
  it('2. Customer with expired driving license is blocked from self-drive booking (403)', async () => {
    // Upload expired DL
    db.prepare(`
      INSERT INTO kyc_documents (user_id, doc_type, doc_number, file_path, expiry_date, status)
      VALUES (?, 'DrivingLicense_Front', 'DL_EXPIRED_123', 'demo_priya_dl_front.jpg', '2025-01-01', 'Approved')
    `).run(customerId);

    db.prepare("UPDATE users SET kyc_status = 'Approved' WHERE user_id = ?").run(customerId);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicle_id: 1,
        start_datetime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        end_datetime: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000).toISOString()
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/License expire ho chuka hai/i);
  });

  // TEST 3: Customer with valid KYC and valid DL can book successfully
  it('3. Customer with valid approved KYC & valid DL books successfully', async () => {
    // Update DL to future date
    db.prepare(`
      UPDATE kyc_documents
      SET expiry_date = '2032-12-31'
      WHERE user_id = ? AND doc_type = 'DrivingLicense_Front'
    `).run(customerId);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicle_id: 3,
        start_datetime: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
        end_datetime: new Date(Date.now() + 152 * 24 * 60 * 60 * 1000).toISOString(),
        pricing_type: 'day'
      });

    expect(res.status).toBe(201);
    expect(res.body.booking_id).toBeDefined();
  });

  // TEST 4: Duplicate document number protection across different accounts
  it('4. Rejects duplicate document number across different accounts (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/kyc/submit-document')
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({
        doc_type: 'DrivingLicense_Front',
        doc_number: 'DL0420190012345', // Already registered to Rahul
        file_path: 'demo_owner_aadhaar.jpg',
        expiry_date: '2030-01-01'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered with another account/i);
  });

  // TEST 5: Owner Multi-step Add Vehicle (5 photos + RC + Insurance) -> Pending Approval
  it('5. Owner adds vehicle with 5 photos and documents -> Pending Approval', async () => {
    const regNo = `GJ01XY${Date.now().toString().slice(-4)}`;
    const res = await request(app)
      .post('/api/owner/vehicles')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        brand: 'Kia',
        name: 'Seltos GTX+',
        category: 'SUV',
        fuel_type: 'Diesel',
        transmission: 'Automatic',
        seats: 5,
        year: 2024,
        registration_number: regNo,
        price_per_day: 3500,
        price_per_hour: 280,
        price_per_km: 18,
        security_deposit: 5000,
        city: 'Ahmedabad',
        photos: [
          { file_path: '/uploads/vehicles/demo_creta_front.webp', image_type: 'Front', is_primary: true },
          { file_path: '/uploads/vehicles/demo_creta_back.webp', image_type: 'Back' },
          { file_path: '/uploads/vehicles/demo_creta_left.webp', image_type: 'Left' },
          { file_path: '/uploads/vehicles/demo_creta_right.webp', image_type: 'Right' },
          { file_path: '/uploads/vehicles/demo_creta_interior.webp', image_type: 'Interior' }
        ],
        documents: [
          { doc_type: 'RC', file_path: 'demo_creta_rc.pdf' },
          { doc_type: 'Insurance', file_path: 'demo_creta_insurance.pdf', expiry_date: '2028-01-01' }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.vehicle.approval_status).toBe('Pending Approval');
    ownerAVehicleId = res.body.vehicle.vehicle_id;

    // Verify it is not visible in public vehicle list yet
    const publicList = await request(app).get('/api/vehicles');
    const found = publicList.body.find(v => v.vehicle_id === ownerAVehicleId);
    expect(found).toBeUndefined();
  });

  // TEST 6: Admin approves owner vehicle -> visible on public site with Hosted by badge
  it('6. Admin approves owner vehicle -> becomes live and available', async () => {
    const res = await request(app)
      .patch(`/api/admin/vehicles/${ownerAVehicleId}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Approved' });

    expect(res.status).toBe(200);
    expect(res.body.approval_status).toBe('Approved');

    // Check public list: now vehicle appears with owner_name
    const publicList = await request(app).get('/api/vehicles');
    const liveVehicle = publicList.body.find(v => v.vehicle_id === ownerAVehicleId);
    expect(liveVehicle).toBeDefined();
    expect(liveVehicle.owner_name).toBeDefined();
  });

  // TEST 7: Cross-Owner Isolation (Owner B cannot view or edit Owner A's vehicle -> 404/403)
  it('7. Cross-Owner Isolation: Owner B cannot access or modify Owner A vehicle (404/403)', async () => {
    // Owner B tries to toggle Owner A vehicle availability
    const res = await request(app)
      .patch(`/api/owner/vehicles/${ownerAVehicleId}/availability`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({});

    expect([403, 404]).toContain(res.status);
    expect(res.body.error).toMatch(/not found|not owned by you/i);
  });

  // TEST 8: Customer books Owner vehicle (COD) -> Complete Trip -> Auto Owner Payout (80/20)
  it('8. Booking owner vehicle -> Trip Complete -> Auto Payout calculation (80% owner, 20% commission)', async () => {
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicle_id: ownerAVehicleId,
        start_datetime: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000).toISOString(),
        end_datetime: new Date(Date.now() + 82 * 24 * 60 * 60 * 1000).toISOString(),
        pricing_type: 'day',
        payment_method: 'COD'
      });

    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.booking_id;
    const totalAmount = bookRes.body.total_amount;

    // Complete booking by admin
    const completeRes = await request(app)
      .patch(`/api/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ actual_return_datetime: new Date().toISOString() });

    expect(completeRes.status).toBe(200);

    // Verify payout row in owner_payouts table
    const payout = db.prepare('SELECT * FROM owner_payouts WHERE booking_id = ?').get(bookingId);
    expect(payout).toBeDefined();
    expect(payout.owner_id).toBe(ownerAId);
    expect(payout.gross_amount).toBe(totalAmount);
    expect(payout.commission_amount).toBeCloseTo(totalAmount * 0.20, 1);
    expect(payout.payout_amount).toBeCloseTo(totalAmount * 0.80, 1);
    expect(payout.status).toBe('Pending');

    // Admin marks payout paid with UTR reference number
    const payRes = await request(app)
      .patch(`/api/admin/payouts/${payout.payout_id}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reference_no: 'UTR_HDFC_99887766' });

    expect(payRes.status).toBe(200);
    expect(payRes.body.status).toBe('Paid');
  });

  // TEST 9: Private files security: Unauthorized users cannot access private files (403)
  it('9. Private file streaming rejects unauthorized user access (403)', async () => {
    const rahulDoc = db.prepare("SELECT doc_id FROM kyc_documents WHERE user_id = (SELECT user_id FROM users WHERE email = 'customer@rental.com') LIMIT 1").get();
    expect(rahulDoc).toBeDefined();

    // Owner B tries to access Rahul's private KYC file
    const res = await request(app)
      .get(`/api/files/kyc/${rahulDoc.doc_id}`)
      .set('Authorization', `Bearer ${ownerBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  // TEST 10: Private files security: Admin or document owner CAN access private file
  it('10. Private file streaming allows admin or document owner', async () => {
    const rahul = db.prepare("SELECT user_id, role FROM users WHERE email = 'customer@rental.com'").get();
    const rahulToken = signToken({ user_id: rahul.user_id, role: rahul.role });
    const rahulDoc = db.prepare('SELECT doc_id FROM kyc_documents WHERE user_id = ? LIMIT 1').get(rahul.user_id);

    const res = await request(app)
      .get(`/api/files/kyc/${rahulDoc.doc_id}`)
      .set('Authorization', `Bearer ${rahulToken}`);

    expect([200, 304]).toContain(res.status);
    expect(res.header['cache-control']).toMatch(/private/i);
  });
});
