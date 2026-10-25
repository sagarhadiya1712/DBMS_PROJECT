const bcrypt = require('bcryptjs');
const db = require('./db');
const initDB = require('./init');
const { encrypt } = require('../utils/encryption');

async function seed() {
  console.log('🌱 Starting database seeding...');

  // Ensure tables exist
  initDB();

  // Clear existing data in reverse dependency order
  const tables = [
    'audit_logs', 'owner_payouts', 'owner_profiles', 'kyc_documents',
    'vehicle_images', 'vehicle_documents', 'reviews', 'payments',
    'bookings', 'fuel_records', 'maintenance', 'drivers', 'discounts',
    'vehicles', 'email_otps', 'users'
  ];

  db.transaction(() => {
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
        db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
      } catch (e) {}
    }
  })();

  // 1. Seed Users (Admin, Customers, and Demo Owner)
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@123', 10);
  const ownerPasswordHash = await bcrypt.hash('Owner@123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, phone, email, password_hash, role, is_verified, is_blocked, kyc_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run('Fleet Admin', '+91 9876543210', 'admin@rental.com', passwordHash, 'admin', 1, 0, 'Approved').lastInsertRowid;
  const cust1Id = insertUser.run('Rahul Verma', '+91 9811223344', 'customer@rental.com', customerPasswordHash, 'customer', 1, 0, 'Approved').lastInsertRowid;
  const cust2Id = insertUser.run('Priya Sharma', '+91 9822334455', 'priya@example.com', customerPasswordHash, 'customer', 1, 0, 'Pending').lastInsertRowid;
  const ownerId = insertUser.run('Vikram Malhotra', '+91 9833445566', 'owner@example.com', ownerPasswordHash, 'owner', 1, 0, 'Approved').lastInsertRowid;

  console.log('  👤 Created 4 users (Admin, Rahul [Approved KYC], Priya [Pending KYC], Vikram [Demo Owner])');

  // 2. Seed Owner Profile with AES-256 Encrypted Bank Account
  const encAccount = encrypt('50100234567890');
  db.prepare(`
    INSERT INTO owner_profiles (owner_id, business_name, address, city, bank_account_holder, bank_account_number_enc, ifsc, upi_id, commission_percent)
    VALUES (?, 'Apex Mobility Fleet', 'Plot 42, Cyber Gateway, Hitech City', 'Hyderabad', 'Vikram Malhotra', ?, 'HDFC0001234', 'vikram@hdfcbank', 20.0)
  `).run(ownerId, encAccount);

  console.log('  🏢 Seeded Owner Profile with AES-256 encrypted bank account');

  // 3. Seed KYC Documents
  const insertKYC = db.prepare(`
    INSERT INTO kyc_documents (user_id, doc_type, doc_number, file_path, expiry_date, status, reviewed_by, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // Rahul (Customer: Approved KYC)
  insertKYC.run(cust1Id, 'DrivingLicense_Front', 'DL0420190012345', 'demo_rahul_dl_front.jpg', '2029-12-31', 'Approved', adminId);
  insertKYC.run(cust1Id, 'DrivingLicense_Back', 'DL0420190012345', 'demo_rahul_dl_back.jpg', '2029-12-31', 'Approved', adminId);
  insertKYC.run(cust1Id, 'Aadhaar_Front', '987654321012', 'demo_rahul_aadhaar_front.jpg', null, 'Approved', adminId);
  insertKYC.run(cust1Id, 'Aadhaar_Back', '987654321012', 'demo_rahul_aadhaar_back.jpg', null, 'Approved', adminId);
  insertKYC.run(cust1Id, 'Selfie', null, 'demo_rahul_selfie.jpg', null, 'Approved', adminId);

  // Priya (Customer: Pending KYC)
  insertKYC.run(cust2Id, 'DrivingLicense_Front', 'DL0720210098765', 'demo_priya_dl_front.jpg', '2028-05-15', 'Pending', null);

  // Owner (Approved KYC)
  insertKYC.run(ownerId, 'Aadhaar_Front', '887766554433', 'demo_owner_aadhaar.jpg', null, 'Approved', adminId);
  insertKYC.run(ownerId, 'PAN', 'ABCDE1234F', 'demo_owner_pan.jpg', null, 'Approved', adminId);
  insertKYC.run(ownerId, 'Selfie', null, 'demo_owner_selfie.jpg', null, 'Approved', adminId);

  console.log('  🪪 Seeded realistic KYC documents for Rahul (Approved), Priya (Pending), and Owner (Approved)');

  // 4. Seed 14 Fleet Vehicles (Company Fleet)
  const now = new Date();
  const formatISO = (d) => d.toISOString().split('T')[0];

  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const in12Days = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
  const in300Days = new Date(now.getTime() + 300 * 24 * 60 * 60 * 1000);
  const in400Days = new Date(now.getTime() + 400 * 24 * 60 * 60 * 1000);

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (
      name, brand, category, fuel_type, transmission, seats,
      price_per_day, price_per_hour, price_per_km, security_deposit,
      status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry,
      owner_id, registration_number, approval_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const vehiclesData = [
    { name: 'Swift ZXi', brand: 'Maruti Suzuki', category: 'Hatchback', fuel_type: 'Petrol', transmission: 'Manual', seats: 5, price_per_day: 1800, price_per_hour: 150, price_per_km: 14, security_deposit: 3000, status: 'Available', image_url: '/vehicles/maruti-suzuki-swift.jpg', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1001' },
    { name: 'i20 Asta (O)', brand: 'Hyundai', category: 'Hatchback', fuel_type: 'Petrol', transmission: 'Automatic', seats: 5, price_per_day: 2200, price_per_hour: 180, price_per_km: 15, security_deposit: 3500, status: 'Available', image_url: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1000&q=80', is_chauffeur_driven: 0, insurance_expiry: formatISO(in5Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1002' },
    { name: 'Tiago XZ+', brand: 'Tata', category: 'Hatchback', fuel_type: 'Petrol', transmission: 'Manual', seats: 5, price_per_day: 1600, price_per_hour: 130, price_per_km: 12, security_deposit: 2500, status: 'Available', image_url: '/vehicles/tata-tiago.jpg', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1003' },
    { name: 'City ZX', brand: 'Honda', category: 'Sedan', fuel_type: 'Petrol', transmission: 'CVT Automatic', seats: 5, price_per_day: 3200, price_per_hour: 260, price_per_km: 18, security_deposit: 5000, status: 'Available', image_url: '/vehicles/honda-city.jpg', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1004' },
    { name: 'Dzire ZXi+', brand: 'Maruti Suzuki', category: 'Sedan', fuel_type: 'Petrol', transmission: 'Automatic', seats: 5, price_per_day: 2000, price_per_hour: 160, price_per_km: 14, security_deposit: 3000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1000&q=80', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in12Days), reg: 'DL01AB1005' },
    { name: 'Verna SX (O) Turbo', brand: 'Hyundai', category: 'Sedan', fuel_type: 'Turbo Petrol', transmission: 'DCT Automatic', seats: 5, price_per_day: 3500, price_per_hour: 280, price_per_km: 20, security_deposit: 6000, status: 'Available', image_url: '/vehicles/hyundai-verna.jpg', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1006' },
    { name: 'Scorpio-N Z8 L', brand: 'Mahindra', category: 'SUV', fuel_type: 'Diesel', transmission: 'Automatic 4Xplor', seats: 7, price_per_day: 4800, price_per_hour: 380, price_per_km: 24, security_deposit: 7000, status: 'Available', image_url: '/vehicles/mahindra-scorpio-n.jpg', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1007' },
    { name: 'Nexon Fearless+ S', brand: 'Tata', category: 'SUV', fuel_type: 'Diesel', transmission: 'Manual', seats: 5, price_per_day: 2800, price_per_hour: 220, price_per_km: 16, security_deposit: 4000, status: 'Available', image_url: '/vehicles/tata-nexon.jpg', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1008' },
    { name: 'Brezza ZXi+', brand: 'Maruti Suzuki', category: 'SUV', fuel_type: 'Petrol Hybrid', transmission: 'Automatic', seats: 5, price_per_day: 2600, price_per_hour: 210, price_per_km: 16, security_deposit: 4000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1009' },
    { name: 'Innova Crysta 2.4 ZX', brand: 'Toyota', category: 'MUV', fuel_type: 'Diesel', transmission: 'Manual', seats: 7, price_per_day: 4500, price_per_hour: 350, price_per_km: 22, security_deposit: 6000, status: 'Available', image_url: '/vehicles/toyota-innova-crysta.jpg', is_chauffeur_driven: 1, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1010' },
    { name: 'Ertiga ZXi+ AT', brand: 'Maruti Suzuki', category: 'MUV', fuel_type: 'Petrol Hybrid', transmission: 'Automatic', seats: 7, price_per_day: 2500, price_per_hour: 200, price_per_km: 15, security_deposit: 4000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1000&q=80', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1011' },
    { name: 'Carens Luxury Plus', brand: 'Kia', category: 'MUV', fuel_type: 'Diesel', transmission: 'Automatic', seats: 6, price_per_day: 3400, price_per_hour: 270, price_per_km: 18, security_deposit: 5000, status: 'Available', image_url: '/vehicles/kia-carens.jpg', is_chauffeur_driven: 0, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1012' },
    { name: 'BMW 3 Series Gran Limousine', brand: 'BMW', category: 'Luxury', fuel_type: 'Petrol', transmission: 'Automatic Steptronic', seats: 5, price_per_day: 8500, price_per_hour: 700, price_per_km: 45, security_deposit: 15000, status: 'Available', image_url: '/vehicles/bmw-3-series.jpg', is_chauffeur_driven: 1, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1013' },
    { name: 'Mercedes-Benz C-Class C200', brand: 'Mercedes-Benz', category: 'Luxury', fuel_type: 'Mild Hybrid Petrol', transmission: '9G-TRONIC', seats: 5, price_per_day: 9500, price_per_hour: 800, price_per_km: 50, security_deposit: 20000, status: 'Available', image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80', is_chauffeur_driven: 1, insurance_expiry: formatISO(in300Days), permit_expiry: formatISO(in400Days), reg: 'DL01AB1014' },
  ];

  const vehicleIds = [];
  for (const v of vehiclesData) {
    const res = insertVehicle.run(
      v.name, v.brand, v.category, v.fuel_type, v.transmission, v.seats,
      v.price_per_day, v.price_per_hour, v.price_per_km, v.security_deposit,
      v.status, v.image_url, v.is_chauffeur_driven, v.insurance_expiry, v.permit_expiry,
      null, v.reg, 'Approved'
    );
    vehicleIds.push(res.lastInsertRowid);
  }

  // 5. Seed Demo Owner Vehicles: 1 Approved (Hyundai Creta) and 1 Pending (Mahindra XUV700)
  // Approved Creta
  const cretaId = insertVehicle.run(
    'Creta SX(O)', 'Hyundai', 'SUV', 'Diesel', 'Automatic', 5,
    3000, 240, 18, 4000,
    'Available', '/uploads/vehicles/demo_creta_front.webp', 0,
    formatISO(in300Days), formatISO(in400Days),
    ownerId, 'GJ05AB1234', 'Approved'
  ).lastInsertRowid;

  // Pending XUV700
  const xuvId = insertVehicle.run(
    'XUV700 AX7 Luxury', 'Mahindra', 'SUV', 'Diesel', 'Automatic', 7,
    4500, 350, 22, 6000,
    'Available', '/uploads/vehicles/demo_creta_front.webp', 0,
    formatISO(in300Days), formatISO(in400Days),
    ownerId, 'MH12CD5678', 'Pending Approval'
  ).lastInsertRowid;

  console.log('  🚗 Seeded company fleet (14) + Owner Approved Creta + Owner Pending XUV700');

  // 6. Seed Multi-Angle Photos for Owner Creta & XUV
  const insertImage = db.prepare(`
    INSERT INTO vehicle_images (vehicle_id, file_path, thumb_path, image_type, is_primary)
    VALUES (?, ?, ?, ?, ?)
  `);

  const cretaAngles = [
    { type: 'Front', isPrimary: 1 },
    { type: 'Back', isPrimary: 0 },
    { type: 'Left', isPrimary: 0 },
    { type: 'Right', isPrimary: 0 },
    { type: 'Interior', isPrimary: 0 }
  ];

  for (const a of cretaAngles) {
    insertImage.run(
      cretaId,
      `/uploads/vehicles/demo_creta_${a.type.toLowerCase()}.webp`,
      `/uploads/vehicles/demo_creta_${a.type.toLowerCase()}_thumb.webp`,
      a.type,
      a.isPrimary
    );
    insertImage.run(
      xuvId,
      `/uploads/vehicles/demo_creta_${a.type.toLowerCase()}.webp`,
      `/uploads/vehicles/demo_creta_${a.type.toLowerCase()}_thumb.webp`,
      a.type,
      a.isPrimary
    );
  }

  // 7. Seed Vehicle Documents for Creta
  const insertDoc = db.prepare(`
    INSERT INTO vehicle_documents (vehicle_id, doc_type, file_path, expiry_date, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertDoc.run(cretaId, 'RC', 'demo_creta_rc.pdf', null, 'Approved');
  insertDoc.run(cretaId, 'Insurance', 'demo_creta_insurance.pdf', formatISO(in300Days), 'Approved');
  insertDoc.run(cretaId, 'PUC', 'demo_creta_rc.pdf', formatISO(in300Days), 'Approved');

  insertDoc.run(xuvId, 'RC', 'demo_creta_rc.pdf', null, 'Pending');
  insertDoc.run(xuvId, 'Insurance', 'demo_creta_insurance.pdf', formatISO(in300Days), 'Pending');

  // 8. Seed Drivers
  const insertDriver = db.prepare(`
    INSERT INTO drivers (name, phone, license_no, vehicle_id)
    VALUES (?, ?, ?, ?)
  `);
  insertDriver.run('Ramesh Singh', '+91 9811122233', 'DL1420110012345', vehicleIds[9]);
  insertDriver.run('Suresh Kumar', '+91 9822233344', 'DL0420150067890', vehicleIds[12]);

  // 9. Seed Discounts
  const insertDiscount = db.prepare(`
    INSERT INTO discounts (code, percent, valid_from, valid_to, active)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertDiscount.run('WELCOME10', 10, '2026-01-01', '2027-12-31', 1);
  insertDiscount.run('FESTIVE20', 20, '2026-01-01', '2027-12-31', 1);

  // 10. Seed Realistic Bookings with Payments and Completed Owner Booking with Payout
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      user_id, vehicle_id, start_datetime, end_datetime, pricing_type,
      total_amount, deposit_amount, discount_amount, late_fee,
      status, payment_method, hold_expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (
      booking_id, amount, method, razorpay_order_id, razorpay_payment_id,
      payment_status, paid_at, collected_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const pastStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastEnd = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();

  // Booking 1: Completed on Owner's Creta
  const b1 = insertBooking.run(
    cust1Id, cretaId, pastStart, pastEnd, 'day',
    9000, 4000, 0, 0,
    'Completed', 'ONLINE', null, pastStart
  ).lastInsertRowid;

  insertPayment.run(b1, 9000, 'Card', 'order_owner_creta_101', 'pay_owner_creta_101', 'Paid', pastStart, null);

  // Generate Owner Payout row for completed booking (80% payout, 20% commission)
  db.prepare(`
    INSERT INTO owner_payouts (owner_id, booking_id, gross_amount, commission_amount, payout_amount, status)
    VALUES (?, ?, 9000, 1800, 7200, 'Pending')
  `).run(ownerId, b1);

  // Seed Review for Booking 1
  db.prepare(`
    INSERT INTO reviews (user_id, vehicle_id, booking_id, rating, comment, created_at)
    VALUES (?, ?, ?, 5, 'Superb car! Extremely comfortable and Vikram was a wonderful host.', ?)
  `).run(cust1Id, cretaId, b1, pastEnd);

  // Booking 2: Active on Company Car
  const activeStart = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const activeEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const b2 = insertBooking.run(cust1Id, vehicleIds[3], activeStart, activeEnd, 'day', 9600, 5000, 960, 0, 'Active', 'ONLINE', null, activeStart).lastInsertRowid;
  insertPayment.run(b2, 9600, 'Card', 'order_demo_102', 'pay_demo_102', 'Paid', activeStart, null);

  // 11. Maintenance and Fuel records
  db.prepare(`
    INSERT INTO maintenance (vehicle_id, service_date, cost, next_due_date, notes)
    VALUES (?, '2026-08-10', 4200, ?, 'Periodic 20,000 km general service')
  `).run(vehicleIds[0], formatISO(in300Days));

  db.prepare(`
    INSERT INTO fuel_records (vehicle_id, date, litres, cost)
    VALUES (?, '2026-10-10', 35, 3600)
  `).run(vehicleIds[0]);

  console.log('  💰 Seeded completed booking with pending owner payout and review');
  console.log('🎉 Seeding successfully completed with 100% Owner & KYC data!');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = seed;
