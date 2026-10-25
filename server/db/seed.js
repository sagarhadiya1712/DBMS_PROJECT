const bcrypt = require('bcryptjs');
const db = require('./db');
const initDB = require('./init');

async function seed() {
  console.log('🌱 Starting database seeding...');

  // Ensure tables exist
  initDB();

  // Clear existing data in reverse dependency order
  const tables = [
    'reviews', 'payments', 'bookings', 'vehicle_documents',
    'fuel_records', 'maintenance', 'drivers', 'discounts',
    'vehicles', 'email_otps', 'users'
  ];

  db.transaction(() => {
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
    }
  })();

  // 1. Seed Users
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, phone, email, password_hash, role, is_verified, is_blocked)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run('Fleet Admin', '+91 9876543210', 'admin@rental.com', passwordHash, 'admin', 1, 0).lastInsertRowid;
  const cust1Id = insertUser.run('Rahul Verma', '+91 9811223344', 'customer@rental.com', customerPasswordHash, 'customer', 1, 0).lastInsertRowid;
  const cust2Id = insertUser.run('Priya Sharma', '+91 9822334455', 'priya@example.com', customerPasswordHash, 'customer', 1, 0).lastInsertRowid;

  console.log('  👤 Created 3 users (1 Admin: admin@rental.com, 2 Customers)');

  // 2. Seed 14 Vehicles (Realistic Indian Fleet)
  // Calculate near-future expiry dates for alerts (within 15 days) and safe dates (1 year out)
  const now = new Date();
  const formatISO = (d) => d.toISOString().split('T')[0];

  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const in12Days = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
  const in300Days = new Date(now.getTime() + 300 * 24 * 60 * 60 * 1000);
  const in400Days = new Date(now.getTime() + 400 * 24 * 60 * 60 * 1000);

  const vehiclesData = [
    // Hatchbacks (3)
    {
      name: 'Swift ZXi',
      brand: 'Maruti Suzuki',
      category: 'Hatchback',
      fuel_type: 'Petrol',
      transmission: 'Manual',
      seats: 5,
      price_per_day: 1800,
      price_per_hour: 150,
      price_per_km: 14,
      security_deposit: 3000,
      status: 'Available',
      image_url: '/vehicles/maruti-suzuki-swift.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'i20 Asta (O)',
      brand: 'Hyundai',
      category: 'Hatchback',
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      seats: 5,
      price_per_day: 2200,
      price_per_hour: 180,
      price_per_km: 15,
      security_deposit: 3500,
      status: 'Available',
      image_url: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1000&q=80',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in5Days), // ALERT: Expiring in 5 days!
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'Tiago XZ+',
      brand: 'Tata',
      category: 'Hatchback',
      fuel_type: 'Petrol',
      transmission: 'Manual',
      seats: 5,
      price_per_day: 1600,
      price_per_hour: 130,
      price_per_km: 12,
      security_deposit: 2500,
      status: 'Available',
      image_url: '/vehicles/tata-tiago.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },

    // Sedans (3)
    {
      name: 'City ZX',
      brand: 'Honda',
      category: 'Sedan',
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      seats: 5,
      price_per_day: 3200,
      price_per_hour: 260,
      price_per_km: 18,
      security_deposit: 5000,
      status: 'Available',
      image_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'Dzire VXi',
      brand: 'Maruti Suzuki',
      category: 'Sedan',
      fuel_type: 'CNG',
      transmission: 'Manual',
      seats: 5,
      price_per_day: 2300,
      price_per_hour: 190,
      price_per_km: 13,
      security_deposit: 3500,
      status: 'Available',
      image_url: '/vehicles/maruti-suzuki-dzire.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in12Days), // ALERT: Permit expiring in 12 days!
    },
    {
      name: 'Verna SX (O)',
      brand: 'Hyundai',
      category: 'Sedan',
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      seats: 5,
      price_per_day: 3400,
      price_per_hour: 280,
      price_per_km: 19,
      security_deposit: 5000,
      status: 'Available',
      image_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1000&q=80',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },

    // SUV & MUV (7)
    {
      name: 'XUV700 AX7 Luxury',
      brand: 'Mahindra',
      category: 'SUV',
      fuel_type: 'Diesel',
      transmission: 'Automatic',
      seats: 7,
      price_per_day: 4800,
      price_per_hour: 390,
      price_per_km: 24,
      security_deposit: 7000,
      status: 'Available',
      image_url: '/vehicles/mahindra-xuv700.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'Nexon Fearless+ S',
      brand: 'Tata',
      category: 'SUV',
      fuel_type: 'Diesel',
      transmission: 'Manual',
      seats: 5,
      price_per_day: 2800,
      price_per_hour: 220,
      price_per_km: 16,
      security_deposit: 4000,
      status: 'Available',
      image_url: '/vehicles/tata-nexon.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'Ertiga ZXi',
      brand: 'Maruti Suzuki',
      category: 'MUV',
      fuel_type: 'Petrol',
      transmission: 'Manual',
      seats: 7,
      price_per_day: 3000,
      price_per_hour: 240,
      price_per_km: 17,
      security_deposit: 4500,
      status: 'Available',
      image_url: '/vehicles/maruti-suzuki-ertiga.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'Innova Crysta 2.4 VX',
      brand: 'Toyota',
      category: 'MUV',
      fuel_type: 'Diesel',
      transmission: 'Automatic',
      seats: 7,
      price_per_day: 4500,
      price_per_hour: 360,
      price_per_km: 22,
      security_deposit: 6000,
      status: 'Available',
      image_url: '/vehicles/toyota-innova-crysta.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'Thar 4x4 Hard Top',
      brand: 'Mahindra',
      category: 'SUV',
      fuel_type: 'Diesel',
      transmission: 'Manual',
      seats: 4,
      price_per_day: 4200,
      price_per_hour: 340,
      price_per_km: 22,
      security_deposit: 6000,
      status: 'Available',
      image_url: '/vehicles/mahindra-thar.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'Creta SX (O)',
      brand: 'Hyundai',
      category: 'SUV',
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      seats: 5,
      price_per_day: 3500,
      price_per_hour: 290,
      price_per_km: 19,
      security_deposit: 5000,
      status: 'Available',
      image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },
    {
      name: 'Punch Creative Flagship',
      brand: 'Tata',
      category: 'SUV',
      fuel_type: 'Petrol',
      transmission: 'Manual',
      seats: 5,
      price_per_day: 2100,
      price_per_hour: 170,
      price_per_km: 14,
      security_deposit: 3000,
      status: 'Available',
      image_url: '/vehicles/tata-punch.jpg',
      is_chauffeur_driven: 0,
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    },

    // Luxury (ONLY ONE option, chauffeur-driven premium taxi)
    {
      name: 'Innova Hycross ZX(O) Hybrid',
      brand: 'Toyota',
      category: 'Luxury',
      fuel_type: 'Petrol Hybrid',
      transmission: 'Automatic',
      seats: 7,
      price_per_day: 6500,
      price_per_hour: 550,
      price_per_km: 30,
      security_deposit: 10000,
      status: 'Available',
      image_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80',
      is_chauffeur_driven: 1, // Chauffeur Driven Luxury Taxi
      insurance_expiry: formatISO(in300Days),
      permit_expiry: formatISO(in400Days),
    }
  ];

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (
      name, brand, category, fuel_type, transmission, seats,
      price_per_day, price_per_hour, price_per_km, security_deposit,
      status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const vehicleIds = [];
  for (const v of vehiclesData) {
    const res = insertVehicle.run(
      v.name, v.brand, v.category, v.fuel_type, v.transmission, v.seats,
      v.price_per_day, v.price_per_hour, v.price_per_km, v.security_deposit,
      v.status, v.image_url, v.is_chauffeur_driven, v.insurance_expiry, v.permit_expiry
    );
    vehicleIds.push(res.lastInsertRowid);
  }

  const luxuryVehicleId = vehicleIds[13]; // Toyota Innova Hycross

  console.log(`  🚗 Seeded ${vehicleIds.length} realistic vehicles (including 1 Luxury Chauffeur-driven)`);

  // 3. Seed Driver (Assigned to the Luxury Taxi)
  const insertDriver = db.prepare(`
    INSERT INTO drivers (name, phone, license_no, vehicle_id)
    VALUES (?, ?, ?, ?)
  `);
  insertDriver.run('Rajesh Sharma (Senior Chauffeur)', '+91 9765432109', 'DL-0420180098765', luxuryVehicleId);
  insertDriver.run('Sunil Kumar (Relief Chauffeur)', '+91 9711224466', 'MH-0220200054321', null);
  console.log('  👨‍✈️ Seeded drivers (1 assigned to Luxury Innova Hycross)');

  // 4. Seed Discount Vouchers
  const insertDiscount = db.prepare(`
    INSERT INTO discounts (code, percent, valid_from, valid_to, active)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertDiscount.run('WELCOME10', 10, '2026-01-01', '2027-12-31', 1);
  insertDiscount.run('FLEET20', 20, '2026-01-01', '2027-12-31', 1);
  console.log('  🎟️ Seeded 2 discount vouchers (WELCOME10, FLEET20)');

  // 5. Seed Sample Bookings with various statuses (including COD & Awaiting Payment)
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      user_id, vehicle_id, start_datetime, end_datetime,
      pricing_type, total_amount, deposit_amount, discount_amount, late_fee,
      status, payment_method, hold_expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (
      booking_id, amount, method, razorpay_order_id, razorpay_payment_id, payment_status, paid_at, collected_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Past dates for completed booking
  const pastStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const pastEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Active dates (now)
  const activeStart = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const activeEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

  // Upcoming dates
  const futureStart1 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const futureEnd1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const futureStart2 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const futureEnd2 = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString();

  const futureStart3 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const futureEnd3 = new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000).toISOString();

  const futureStart4 = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString();
  const futureEnd4 = new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000).toISOString();

  const futureStart5 = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString();
  const futureEnd5 = new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000).toISOString();

  // Booking 1: Completed (Online)
  const b1 = insertBooking.run(cust1Id, vehicleIds[0], pastStart, pastEnd, 'day', 5400, 3000, 0, 0, 'Completed', 'ONLINE', null, pastStart).lastInsertRowid;
  insertPayment.run(b1, 5400, 'Card', 'order_demo_101', 'pay_demo_101', 'Paid', pastStart, null);

  // Booking 2: Active (Online)
  const b2 = insertBooking.run(cust1Id, vehicleIds[3], activeStart, activeEnd, 'day', 9600, 5000, 960, 0, 'Active', 'ONLINE', null, activeStart).lastInsertRowid;
  insertPayment.run(b2, 9600, 'Card', 'order_demo_102', 'pay_demo_102', 'Paid', activeStart, null);

  // Booking 3: Confirmed (Online Upcoming)
  const b3 = insertBooking.run(cust2Id, vehicleIds[6], futureStart1, futureEnd1, 'day', 14400, 7000, 0, 0, 'Confirmed', 'ONLINE', null, now.toISOString()).lastInsertRowid;
  insertPayment.run(b3, 14400, 'Card', 'order_demo_103', 'pay_demo_103', 'Paid', now.toISOString(), null);

  // Booking 4: Confirmed (COD - Cash on Delivery, Payment Pending at Pickup)
  const b4 = insertBooking.run(cust2Id, luxuryVehicleId, futureStart2, futureEnd2, 'day', 13000, 10000, 1300, 0, 'Confirmed', 'COD', null, now.toISOString()).lastInsertRowid;
  insertPayment.run(b4, 23000, 'COD', null, null, 'Pending', null, null);

  // Booking 5: Awaiting Payment (Online - 10 min hold slot)
  const holdExpiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const b5 = insertBooking.run(cust1Id, vehicleIds[1], futureStart4, futureEnd4, 'day', 4600, 3000, 0, 0, 'Awaiting Payment', 'ONLINE', holdExpiry, now.toISOString()).lastInsertRowid;
  insertPayment.run(b5, 7600, 'Card', 'order_demo_hold_105', null, 'Pending', null, null);

  // Booking 6: Cancelled
  const b6 = insertBooking.run(cust1Id, vehicleIds[7], futureStart3, futureEnd3, 'day', 5600, 4000, 0, 0, 'Cancelled', 'ONLINE', null, now.toISOString()).lastInsertRowid;
  insertPayment.run(b6, 5600, 'Card', 'order_demo_106', 'pay_demo_106', 'Refunded', now.toISOString(), null);

  console.log('  📑 Seeded realistic bookings with payments (Completed, Active, Confirmed, COD Pending, Awaiting Payment, Cancelled)');

  // 6. Seed Review for the Completed Booking
  const insertReview = db.prepare(`
    INSERT INTO reviews (user_id, vehicle_id, booking_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertReview.run(cust1Id, vehicleIds[0], b1, 5, 'Super smooth experience! The Swift was spotless, fuel efficient, and pickup was hassle free.', pastEnd);
  console.log('  ⭐ Seeded sample review');

  // 7. Seed 3 Maintenance records (one with service due in 7 days to trigger service alert!)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const insertMaintenance = db.prepare(`
    INSERT INTO maintenance (vehicle_id, service_date, cost, next_due_date, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertMaintenance.run(vehicleIds[0], '2026-08-10', 4200, formatISO(in300Days), 'Periodic 20,000 km general service, synthetic oil change and wheel alignment');
  insertMaintenance.run(vehicleIds[3], '2026-09-01', 5800, formatISO(in7Days), 'Brake pad replacement and AC disinfection (Next general checkup due in 7 days)');
  insertMaintenance.run(vehicleIds[6], '2026-07-15', 7500, formatISO(in300Days), 'Scheduled 15,000 km checkup and coolant replenishment');
  console.log('  🛠️ Seeded 3 maintenance records (includes service due in 7 days)');

  // 8. Seed Fuel Records
  const insertFuel = db.prepare(`
    INSERT INTO fuel_records (vehicle_id, date, litres, cost)
    VALUES (?, ?, ?, ?)
  `);
  insertFuel.run(vehicleIds[0], '2026-10-10', 35, 3600);
  insertFuel.run(vehicleIds[3], '2026-10-15', 40, 4200);
  insertFuel.run(vehicleIds[6], '2026-10-18', 55, 5100);
  console.log('  ⛽ Seeded 3 fuel records');

  // 9. Seed Vehicle Documents
  const insertDoc = db.prepare(`
    INSERT INTO vehicle_documents (vehicle_id, doc_type, file_url, expiry_date)
    VALUES (?, ?, ?, ?)
  `);
  insertDoc.run(vehicleIds[0], 'Insurance Policy', 'https://example.com/docs/swift_ins.pdf', formatISO(in300Days));
  insertDoc.run(vehicleIds[1], 'Comprehensive Insurance', 'https://example.com/docs/i20_ins.pdf', formatISO(in5Days)); // ALERT!
  insertDoc.run(vehicleIds[4], 'State Commercial Permit', 'https://example.com/docs/dzire_permit.pdf', formatISO(in12Days)); // ALERT!
  insertDoc.run(luxuryVehicleId, 'Commercial All-India Permit', 'https://example.com/docs/innova_permit.pdf', formatISO(in400Days));
  console.log('  📄 Seeded vehicle documents with expiry dates');

  console.log('🎉 Seeding successfully completed!');
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
