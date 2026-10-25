process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../server');
const db = require('../db/db');
const seed = require('../db/seed');

beforeAll(async () => {
  // Ensure database is freshly seeded
  await seed();
});

describe('Vehicle Rental & Fleet Management System - Full Test Suite', () => {
  let adminToken = '';
  let customerToken = '';
  let testCustomerEmail = `tester_${Date.now()}@example.com`;
  let testVehicleId = null;
  let testBookingId = null;

  // 1. AUTH & OTP FLOW
  describe('Authentication & Email OTP Flow', () => {
    it('should login admin with seeded credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@rental.com',
          password: 'Admin@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('admin');
      adminToken = res.body.token;
    });

    it('should register a new unverified user and send 6-digit OTP', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Aarav Patel',
          phone: '+91 9888877777',
          email: testCustomerEmail,
          password: 'Password@123'
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(testCustomerEmail);
      expect(res.body.simulatedOtp).toBeDefined();
      expect(res.body.simulatedOtp.length).toBe(6);
    });

    it('should reject login for unverified user with 403', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testCustomerEmail,
          password: 'Password@123'
        });

      expect(res.status).toBe(403);
      expect(res.body.unverified).toBe(true);
    });

    it('should verify OTP and activate account', async () => {
      // Fetch the generated OTP from DB
      const otpRow = db.prepare('SELECT * FROM email_otps WHERE email = ? ORDER BY otp_id DESC LIMIT 1').get(testCustomerEmail);
      expect(otpRow).toBeDefined();

      // Retrieve the raw simulated OTP or test verification
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Aarav Patel',
          email: testCustomerEmail,
          password: 'Password@123'
        });

      const rawOtp = res.body.simulatedOtp;

      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: testCustomerEmail,
          otp: rawOtp
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.token).toBeDefined();
      expect(verifyRes.body.user.is_verified).toBe(1);
      customerToken = verifyRes.body.token;
    });
  });

  // 2. VEHICLE SEARCH & AVAILABILITY
  describe('Vehicles & Date Overlap Availability', () => {
    it('should list all available vehicles with computed rating', async () => {
      const res = await request(app).get('/api/vehicles');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(14);
      testVehicleId = res.body[0].vehicle_id;
    });

    it('should filter vehicles by category (Sedan)', async () => {
      const res = await request(app).get('/api/vehicles?category=Sedan');
      expect(res.status).toBe(200);
      expect(res.body.every(v => v.category === 'Sedan')).toBe(true);
    });
  });

  // 3. ZERO DOUBLE-BOOKING GUARD & BOOKING CREATION
  describe('Strict Zero Double-Booking Guard', () => {
    const bookingStart = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString();
    const bookingEnd = new Date(Date.now() + 53 * 24 * 60 * 60 * 1000).toISOString();

    it('should successfully create first booking with discount voucher', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicle_id: testVehicleId,
          start_datetime: bookingStart,
          end_datetime: bookingEnd,
          pricing_type: 'day',
          discount_code: 'WELCOME10'
        });

      expect(res.status).toBe(201);
      expect(res.body.booking_id).toBeDefined();
      expect(res.body.discount_amount).toBeGreaterThan(0);
      testBookingId = res.body.booking_id;
    });

    it('MUST REJECT second user booking the same vehicle for overlapping dates (409 Conflict)', async () => {
      // Overlapping by 1 day: starts before first ends
      const overlapStart = new Date(Date.now() + 52 * 24 * 60 * 60 * 1000).toISOString();
      const overlapEnd = new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicle_id: testVehicleId,
          start_datetime: overlapStart,
          end_datetime: overlapEnd,
          pricing_type: 'day'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Schedule conflict');
    });
  });

  // 4. PAYMENTS & RAZORPAY TEST MODE
  describe('Payments & Razorpay Test Verification', () => {
    it('should generate Razorpay test order', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ booking_id: testBookingId });

      expect(res.status).toBe(200);
      expect(res.body.order_id).toBeDefined();
    });

    it('should verify test payment signature and confirm booking', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          booking_id: testBookingId,
          razorpay_order_id: 'order_test_99999',
          razorpay_payment_id: 'pay_test_99999',
          razorpay_signature: 'simulated_valid_signature_2026'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify status changed to Approved
      const b = db.prepare('SELECT status FROM bookings WHERE booking_id = ?').get(testBookingId);
      expect(b.status).toBe('Approved');
    });

    it('should stream PDF tax invoice for the booking', async () => {
      const res = await request(app).get(`/api/payments/invoice/${testBookingId}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });
  });

  // 5. ADMIN RETURN & REVIEWS
  describe('Admin Return Processing & Reviews', () => {
    it('should complete vehicle return and calculate late fee', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBookingId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          actual_return_datetime: new Date().toISOString(),
          extra_fee: 500
        });

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('Completed');
      expect(res.body.late_fee).toBe(500);
    });

    it('should allow customer to review the completed rental', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          booking_id: testBookingId,
          rating: 5,
          comment: 'Fantastic drive! The vehicle was clean, agile, and well maintained.'
        });

      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(5);
    });
  });

  // 6. FLEET ALERTS & ADMIN REPORTS
  describe('Fleet Alerts & Analytics Reports', () => {
    it('should return 15-day compliance alerts', async () => {
      const res = await request(app)
        .get('/api/fleet/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should export Excel fleet analytics workbook', async () => {
      const res = await request(app)
        .get('/api/reports/export?type=excel')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });
});
