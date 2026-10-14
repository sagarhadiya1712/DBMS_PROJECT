const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');

describe('Booking Lifecycle & No Double-Booking Overlap Tests', () => {
  let customerToken;
  let testVehicle;
  let pickupBranch;
  let createdBookingId;

  beforeAll(async () => {
    // Login as John Doe
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'Password123!' });
    customerToken = loginRes.body.data.accessToken;

    testVehicle = await prisma.vehicle.findFirst({
      where: { status: 'AVAILABLE' },
    });

    pickupBranch = await prisma.branch.findFirst();
  });

  afterAll(async () => {
    if (createdBookingId) {
      await prisma.payment.deleteMany({ where: { bookingId: createdBookingId } });
      await prisma.checkinCheckout.deleteMany({ where: { bookingId: createdBookingId } });
      await prisma.booking.deleteMany({ where: { id: createdBookingId } });
    }
    await prisma.$disconnect();
  });

  it('POST /api/bookings/quote - calculates correct pricing and respects promo codes', async () => {
    const start = new Date(Date.now() + 86400000 * 5); // 5 days in future
    const end = new Date(Date.now() + 86400000 * 8); // 3 days rental

    const res = await request(app)
      .post('/api/bookings/quote')
      .send({
        vehicleId: testVehicle.id,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        promoCode: 'WELCOME10',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalDays).toBe(3);
    expect(res.body.data.discountAmount).toBeGreaterThan(0);
    expect(res.body.data.totalPrice).toBeGreaterThan(0);
  });

  it('POST /api/bookings - books vehicle successfully for future slot', async () => {
    const start = new Date(Date.now() + 86400000 * 15);
    const end = new Date(Date.now() + 86400000 * 18);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicle.id,
        pickupBranchId: pickupBranch.id,
        dropBranchId: pickupBranch.id,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        promoCode: 'WELCOME10',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking.bookingReference).toMatch(/^BK-\d{4}-/);
    expect(res.body.data.razorpayOrder).toBeDefined();

    createdBookingId = res.body.data.booking.id;
  });

  it('PREVENT DOUBLE-BOOKING: rejects overlapping booking for the same vehicle', async () => {
    // Try to book overlapping date range (day 16 to day 19, overlaps with 15-18)
    const overlappingStart = new Date(Date.now() + 86400000 * 16);
    const overlappingEnd = new Date(Date.now() + 86400000 * 19);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicle.id,
        pickupBranchId: pickupBranch.id,
        dropBranchId: pickupBranch.id,
        startDateTime: overlappingStart.toISOString(),
        endDateTime: overlappingEnd.toISOString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Vehicle is not available');
  });

  it('Payment Verification - confirms booking and captures payment', async () => {
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: createdBookingId,
        orderId: 'order_test_mock_123',
        paymentId: 'pay_test_mock_456',
        signature: 'valid_test_signature',
        method: 'card',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking.status).toBe('CONFIRMED');
    expect(res.body.data.payment.status).toBe('CAPTURED');
  });
});
