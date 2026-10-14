const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');

describe('Auth & RBAC Test Suite', () => {
  const testEmail = `renter_${Date.now()}@test.com`;

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: { email: { contains: 'test.com' } },
    });
    await prisma.$disconnect();
  });

  it('POST /api/auth/register - successfully registers a new customer', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        firstName: 'Tester',
        lastName: 'User',
        phone: '+1-555-9999',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/login - successfully logs in existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@rentfleet.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/login - rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@rentfleet.com',
        password: 'WrongPassword999',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('RBAC Guard - denies CUSTOMER access to Admin Dashboard', async () => {
    // 1. Login as customer
    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john@example.com',
        password: 'Password123!',
      });
    const customerToken = customerLogin.body.data.accessToken;

    // 2. Access /api/admin/dashboard
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('RBAC Guard - grants ADMIN access to Admin Dashboard', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@rentfleet.com',
        password: 'Password123!',
      });
    const adminToken = adminLogin.body.data.accessToken;

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis).toBeDefined();
  });
});
