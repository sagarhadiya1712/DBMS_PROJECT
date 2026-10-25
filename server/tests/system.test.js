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
      expect(res.body.error).toMatch(/already booked|conflict/i);
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

      // Verify status changed to Confirmed
      const b = db.prepare('SELECT status FROM bookings WHERE booking_id = ?').get(testBookingId);
      expect(b.status).toBe('Confirmed');
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

  // 7. STRICT EMAIL OTP & GOOGLE OAUTH RULES
  describe('Strict Email OTP Rules, Brute-Force Lockout & Google Login', () => {
    const freshUserEmail = `strict_tester_${Date.now()}@example.com`;
    let userRawOtp = '';

    it('should reject signup with password less than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Short Pass',
          email: `shortpass_${Date.now()}@example.com`,
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('8 characters');
    });

    it('should reject duplicate signup for verified email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Admin Duplicate',
          email: 'admin@rental.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already verified');
    });

    it('should register fresh user with 60-second OTP', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Strict User',
          phone: '+91 9123456789',
          email: freshUserEmail,
          password: 'SecurePassword123'
        });

      expect(res.status).toBe(201);
      expect(res.body.expires_in).toBe(60);
      expect(res.body.simulatedOtp).toBeDefined();
      userRawOtp = res.body.simulatedOtp;
    });

    it('should reject resend OTP within 60s cooldown with 429 and retry_after', async () => {
      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: freshUserEmail });

      expect(res.status).toBe(429);
      expect(res.body.retry_after).toBeDefined();
      expect(res.body.retry_after).toBeGreaterThan(0);
    });

    it('should track failed attempts and lock out OTP after 5 wrong attempts', async () => {
      // 4 wrong attempts
      for (let i = 1; i <= 4; i++) {
        const res = await request(app)
          .post('/api/auth/verify-otp')
          .send({
            email: freshUserEmail,
            otp: '000000'
          });
        expect(res.status).toBe(400);
        expect(res.body.remaining_attempts).toBe(5 - i);
      }

      // 5th wrong attempt -> blocked
      const lockRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: freshUserEmail,
          otp: '000000'
        });

      expect(lockRes.status).toBe(400);
      expect(lockRes.body.error).toContain('blocked');
    });

    it('should reject expired OTP with 400 "OTP expire ho gaya, naya code mangao"', async () => {
      const expiredEmail = `expired_${Date.now()}@example.com`;
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Expired Tester',
          email: expiredEmail,
          password: 'SecurePassword123'
        });

      // Manually simulate expiration in SQLite DB
      db.prepare("UPDATE email_otps SET expires_at = datetime('now', '-10 seconds') WHERE email = ?").run(expiredEmail);

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: expiredEmail,
          otp: '123456'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('OTP expire ho gaya, naya code mangao');
    });

    it('should handle Google Login, create verified user, and signal needsPhone', async () => {
      const googleEmail = `google_user_${Date.now()}@gmail.com`;
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          email: googleEmail,
          name: 'Google Traveler',
          google_id: 'sub_123456789'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.is_verified).toBe(1);
      expect(res.body.needsPhone).toBe(true);

      // Complete profile with phone number
      const profileRes = await request(app)
        .put('/api/auth/complete-profile')
        .set('Authorization', `Bearer ${res.body.token}`)
        .send({
          phone: '+91 9988776655'
        });

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.user.phone).toBe('+91 9988776655');

      // Verify immediate live write in rental.db
      const dbCheck = db.prepare('SELECT phone FROM users WHERE email = ?').get(googleEmail);
      expect(dbCheck.phone).toBe('+91 9988776655');
    });

    it('should inspect live SQLite rental.db via /api/dev/db-inspect', async () => {
      const res = await request(app).get('/api/dev/db-inspect');
      expect(res.status).toBe(200);
      expect(res.body.database.journal_mode).toBe('DELETE');
      expect(res.body.database.foreign_keys).toBe('ON');
      expect(res.body.counts.users).toBeGreaterThan(0);
    });
  });
});
