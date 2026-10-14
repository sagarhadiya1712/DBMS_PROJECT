const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with Indian fleet & branches...');

  // Clean existing transactional and vehicle data first
  await prisma.review.deleteMany();
  await prisma.checkinCheckout.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.vehicleImage.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.auditLog.deleteMany();

  // 1. Roles
  const roles = [
    { name: 'ADMIN', description: 'System Administrator with full access' },
    { name: 'MANAGER', description: 'Branch and fleet operations manager' },
    { name: 'STAFF', description: 'Front-desk check-in/check-out staff' },
    { name: 'CUSTOMER', description: 'Registered customer and renter' },
  ];

  const createdRoles = {};
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
    createdRoles[r.name] = role;
  }
  console.log('✅ Roles created');

  // 2. Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = [
    {
      email: 'admin@rentfleet.com',
      firstName: 'Rajesh',
      lastName: 'Patel',
      roleId: createdRoles.ADMIN.id,
      phone: '+91-98250-12345',
      isVerified: true,
    },
    {
      email: 'manager@rentfleet.com',
      firstName: 'Ananya',
      lastName: 'Deshmukh',
      roleId: createdRoles.MANAGER.id,
      phone: '+91-98220-67890',
      isVerified: true,
    },
    {
      email: 'staff@rentfleet.com',
      firstName: 'Vikram',
      lastName: 'Solanki',
      roleId: createdRoles.STAFF.id,
      phone: '+91-98790-11223',
      isVerified: true,
    },
    {
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Fernandes',
      roleId: createdRoles.CUSTOMER.id,
      phone: '+91-98980-44556',
      drivingLicenseNumber: 'GJ05-2019-0098234',
      drivingLicenseUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      isVerified: true,
    },
    {
      email: 'sarah@example.com',
      firstName: 'Pooja',
      lastName: 'Sharma',
      roleId: createdRoles.CUSTOMER.id,
      phone: '+91-98240-77889',
      drivingLicenseNumber: 'MH01-2021-0044910',
      drivingLicenseUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      isVerified: true,
    },
  ];

  const createdUsers = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, roleId: u.roleId, firstName: u.firstName, lastName: u.lastName },
      create: { ...u, passwordHash },
    });
    createdUsers[u.email] = user;
  }
  console.log('✅ Users created (Password: Password123!)');

  // 3. Indian Branches: Surat, Ahmedabad, Mumbai, Pune
  const branches = [
    {
      name: 'Surat Ring Road Hub',
      code: 'SRT-01',
      address: 'Swami Bhavan, SVNIT, Ichchhanath, Surat',
      city: 'Surat',
      state: 'Gujarat',
      postalCode: '395007',
      phone: '+91 70168 70683',
      email: 'surat@rentfleet.in',
      latitude: 21.1643,
      longitude: 72.7838,
      operatingHours: '07:00 AM - 10:00 PM',
    },
    {
      name: 'Ahmedabad Airport Terminal',
      code: 'AMD-02',
      address: 'Sardar Vallabhbhai Patel Int Airport, Terminal 1',
      city: 'Ahmedabad',
      state: 'Gujarat',
      postalCode: '382475',
      phone: '+91-79-22869012',
      email: 'ahmedabad@rentfleet.in',
      latitude: 23.0734,
      longitude: 72.6266,
      operatingHours: '24/7 Full Service',
    },
    {
      name: 'Mumbai BKC Executive Station',
      code: 'BOM-03',
      address: 'Bandra Kurla Complex, G-Block, Bandra East',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      phone: '+91-22-26549012',
      email: 'mumbai@rentfleet.in',
      latitude: 19.0657,
      longitude: 72.8687,
      operatingHours: '24/7 Full Service',
    },
    {
      name: 'Pune Hinjewadi Tech Hub',
      code: 'PNQ-04',
      address: 'Phase 1 Hinjewadi Rajiv Gandhi Infotech Park',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411057',
      phone: '+91-20-22939012',
      email: 'pune@rentfleet.in',
      latitude: 18.5913,
      longitude: 73.7389,
      operatingHours: '08:00 AM - 09:00 PM',
    },
  ];

  const createdBranches = [];
  for (const b of branches) {
    const branch = await prisma.branch.upsert({
      where: { code: b.code },
      update: b,
      create: b,
    });
    createdBranches.push(branch);
  }
  console.log('✅ 4 Indian Branches created (Surat, Ahmedabad, Mumbai, Pune)');

  // 4. Exactly 15 Indian Vehicles:
  // Hatchback (4), Sedan (3), SUV (5), MUV (2), and Exactly ONE Luxury Taxi (1)
  const vehicleData = [
    // --- HATCHBACK (4) ---
    {
      vin: 'MBH3FA00000100101',
      licensePlate: 'GJ05AB1234',
      make: 'Maruti Suzuki',
      model: 'Swift ZXi',
      year: 2024,
      category: 'HATCHBACK',
      transmission: 'Manual',
      fuelType: 'Petrol',
      seatingCapacity: 5,
      mileage: 18500,
      color: 'Solid Fire Red',
      features: 'SmartPlay Pro Touchscreen, Wireless Android Auto, Dual Front Airbags, 22 kmpl Efficiency',
      dailyRate: 1500,
      hourlyRate: 150,
      status: 'AVAILABLE',
      branchId: createdBranches[0].id, // Surat
      imageUrl: '/vehicles/maruti-suzuki-swift.jpg',
    },
    {
      vin: 'MBH3FA00000100102',
      licensePlate: 'GJ01CD2345',
      make: 'Maruti Suzuki',
      model: 'Alto K10 VXi',
      year: 2023,
      category: 'HATCHBACK',
      transmission: 'Manual',
      fuelType: 'Petrol',
      seatingCapacity: 4,
      mileage: 26000,
      color: 'Silky Silver',
      features: 'Ultra-compact city maneuvering, AC, Power Steering, 24.3 kmpl High Mileage',
      dailyRate: 1200,
      hourlyRate: 120,
      status: 'AVAILABLE',
      branchId: createdBranches[1].id, // Ahmedabad
      imageUrl: '/vehicles/maruti-suzuki-alto-k10.jpg',
    },
    {
      vin: 'MAT6FA00000100103',
      licensePlate: 'MH12EF3456',
      make: 'Tata',
      model: 'Tiago XZ+',
      year: 2024,
      category: 'HATCHBACK',
      transmission: 'Manual',
      fuelType: 'CNG',
      seatingCapacity: 5,
      mileage: 14200,
      color: 'Daytona Grey',
      features: 'iCNG Twin Cylinder Tech, 4-Star GNCAP Safety, Harman Sound System, Rear Camera',
      dailyRate: 1400,
      hourlyRate: 140,
      status: 'AVAILABLE',
      branchId: createdBranches[3].id, // Pune
      imageUrl: '/vehicles/tata-tiago.jpg',
    },
    {
      vin: 'MALHFA00000100104',
      licensePlate: 'MH02GH4567',
      make: 'Hyundai',
      model: 'Grand i10 Nios Asta',
      year: 2023,
      category: 'HATCHBACK',
      transmission: 'Automatic',
      fuelType: 'Petrol',
      seatingCapacity: 5,
      mileage: 21000,
      color: 'Polar White',
      features: 'AMT Automatic, Wireless Charger, 8-inch Infotainment, Cruise Control, Projector Lamps',
      dailyRate: 1700,
      hourlyRate: 170,
      status: 'AVAILABLE',
      branchId: createdBranches[2].id, // Mumbai
      imageUrl: '/vehicles/hyundai-grand-i10-nios.jpg',
    },

    // --- SEDAN (3) ---
    {
      vin: 'MBH3FA00000100105',
      licensePlate: 'GJ05IJ5678',
      make: 'Maruti Suzuki',
      model: 'Dzire ZXi Plus',
      year: 2024,
      category: 'SEDAN',
      transmission: 'Automatic',
      fuelType: 'Petrol',
      seatingCapacity: 5,
      mileage: 12000,
      color: 'Sherwood Brown',
      features: 'Spacious 378L Boot, Auto Climate Control, Rear AC Vents, Push Button Start, 22.4 kmpl',
      dailyRate: 2000,
      hourlyRate: 200,
      status: 'AVAILABLE',
      branchId: createdBranches[0].id, // Surat
      imageUrl: '/vehicles/maruti-suzuki-dzire.jpg',
    },
    {
      vin: 'MAK1FA00000100106',
      licensePlate: 'MH14KL6789',
      make: 'Honda',
      model: 'Amaze VX CVT',
      year: 2023,
      category: 'SEDAN',
      transmission: 'Automatic',
      fuelType: 'Petrol',
      seatingCapacity: 5,
      mileage: 19500,
      color: 'Meteoroid Grey',
      features: 'Smooth CVT Automatic, Paddle Shifters, 420L Trunk Space, Premium Fabric Upholstery',
      dailyRate: 2200,
      hourlyRate: 220,
      status: 'AVAILABLE',
      branchId: createdBranches[3].id, // Pune
      imageUrl: '/vehicles/honda-amaze.jpg',
    },
    {
      vin: 'MAT6FA00000100107',
      licensePlate: 'DL08MN7890',
      make: 'Tata',
      model: 'Tigor XZ+ EV',
      year: 2024,
      category: 'SEDAN',
      transmission: 'Automatic',
      fuelType: 'Electric',
      seatingCapacity: 5,
      mileage: 9800,
      color: 'Teal Blue',
      features: '315 km Certified Range, Zero Emission, Fast DC Charging Support, Silent Cabin',
      dailyRate: 2400,
      hourlyRate: 240,
      status: 'AVAILABLE',
      branchId: createdBranches[2].id, // Mumbai
      imageUrl: '/vehicles/tata-tigor.jpg',
    },

    // --- SUV / COMPACT SUV (5) ---
    {
      vin: 'MAT6FA00000100108',
      licensePlate: 'GJ05OP8901',
      make: 'Tata',
      model: 'Nexon Fearless+ S',
      year: 2024,
      category: 'SUV',
      transmission: 'Manual',
      fuelType: 'Diesel',
      seatingCapacity: 5,
      mileage: 15400,
      color: 'Fearless Purple',
      features: '5-Star GNCAP Rating, 360 Camera, Ventilated Leatherette Seats, Voice Sunroof',
      dailyRate: 2800,
      hourlyRate: 280,
      status: 'AVAILABLE',
      branchId: createdBranches[0].id, // Surat
      imageUrl: '/vehicles/tata-nexon.jpg',
    },
    {
      vin: 'MAT6FA00000100109',
      licensePlate: 'MH12QR9012',
      make: 'Tata',
      model: 'Punch Creative',
      year: 2024,
      category: 'SUV',
      transmission: 'Automatic',
      fuelType: 'Petrol',
      seatingCapacity: 5,
      mileage: 11000,
      color: 'Tornado Blue',
      features: 'High Ground Clearance 187mm, 5-Star Safety, Auto Headlamps, Cooled Glovebox',
      dailyRate: 2500,
      hourlyRate: 250,
      status: 'AVAILABLE',
      branchId: createdBranches[3].id, // Pune
      imageUrl: '/vehicles/tata-punch.jpg',
    },
    {
      vin: 'MA1TFA00000100110',
      licensePlate: 'MH01ST1010',
      make: 'Mahindra',
      model: 'XUV700 AX7 Luxury',
      year: 2024,
      category: 'SUV',
      transmission: 'Automatic',
      fuelType: 'Diesel',
      seatingCapacity: 7,
      mileage: 16800,
      color: 'Midnight Black',
      features: 'Level 2 ADAS, Panoramic Skyroof, 12-Speaker Sony 3D Sound, Alexa Integration, AWD',
      dailyRate: 4200,
      hourlyRate: 420,
      status: 'RENTED', // 1 Rented
      branchId: createdBranches[2].id, // Mumbai
      imageUrl: '/vehicles/mahindra-xuv700.jpg',
    },
    {
      vin: 'MA1TFA00000100111',
      licensePlate: 'DL01UV1111',
      make: 'Mahindra',
      model: 'Scorpio-N Z8L 4x4',
      year: 2024,
      category: 'SUV',
      transmission: 'Automatic',
      fuelType: 'Diesel',
      seatingCapacity: 7,
      mileage: 14000,
      color: 'Deep Forest',
      features: 'Shift-on-the-fly 4WD, mHawk 175 BHP Diesel, 4XPLOR Terrain Modes, Captain Seats',
      dailyRate: 3800,
      hourlyRate: 380,
      status: 'MAINTENANCE', // 1 in Maintenance
      branchId: createdBranches[1].id, // Ahmedabad
      imageUrl: '/vehicles/mahindra-scorpio-n.jpg',
    },
    {
      vin: 'MA1TFA00000100112',
      licensePlate: 'GJ01WX1212',
      make: 'Mahindra',
      model: 'Thar LX 4x4 Hard Top',
      year: 2023,
      category: 'SUV',
      transmission: 'Manual',
      fuelType: 'Diesel',
      seatingCapacity: 4,
      mileage: 22000,
      color: 'Napoli Black',
      features: 'Mechanical Locking Differential, Washable Interior, 4x4 Low-Range Transfer Case, Iconic Stance',
      dailyRate: 3200,
      hourlyRate: 320,
      status: 'AVAILABLE',
      branchId: createdBranches[1].id, // Ahmedabad
      imageUrl: '/vehicles/mahindra-thar.jpg',
    },

    // --- MUV / FAMILY (2) ---
    {
      vin: 'MBH3FA00000100113',
      licensePlate: 'MH14YZ1313',
      make: 'Maruti Suzuki',
      model: 'Ertiga ZXi CNG',
      year: 2024,
      category: 'MUV',
      transmission: 'Manual',
      fuelType: 'CNG',
      seatingCapacity: 7,
      mileage: 25000,
      color: 'Magma Grey',
      features: '7-Passenger Comfort, Factory-fitted CNG (26.1 km/kg), Split Folding Rows, Roof AC',
      dailyRate: 2600,
      hourlyRate: 260,
      status: 'AVAILABLE',
      branchId: createdBranches[3].id, // Pune
      imageUrl: '/vehicles/maruti-suzuki-ertiga.jpg',
    },
    {
      vin: 'MT17FA00000100114',
      licensePlate: 'GJ05AA1414',
      make: 'Toyota',
      model: 'Innova Crysta 2.4 VX',
      year: 2024,
      category: 'MUV',
      transmission: 'Manual',
      fuelType: 'Diesel',
      seatingCapacity: 7,
      mileage: 28000,
      color: 'Super White',
      features: 'Legendary Bulletproof Reliability, Premium Captain Seats, Superior Highway Ride Quality, Rear Auto AC',
      dailyRate: 3500,
      hourlyRate: 350,
      status: 'MAINTENANCE', // 2nd vehicle in Maintenance
      branchId: createdBranches[0].id, // Surat
      imageUrl: '/vehicles/toyota-innova-crysta.jpg',
    },

    // --- LUXURY TAXI (EXACTLY ONE) ---
    {
      vin: 'WDD213FA00000100115',
      licensePlate: 'MH01LX1515',
      make: 'Mercedes-Benz',
      model: 'E-Class Exclusive LWB (Chauffeur Taxi)',
      year: 2024,
      category: 'LUXURY_TAXI',
      transmission: 'Automatic',
      fuelType: 'Diesel',
      seatingCapacity: 4,
      mileage: 8500,
      color: 'Obsidian Black Metallic',
      features: 'Dedicated Professional Chauffeur Included, Rear Reclining Executive Seat, Panoramic Sunroof, Burmester Audio, Airport Meet & Greet',
      dailyRate: 10500,
      hourlyRate: 1200,
      status: 'AVAILABLE',
      branchId: createdBranches[2].id, // Mumbai BKC
      imageUrl: '/vehicles/mercedes-benz-e-class.jpg',
    },
  ];

  const createdVehicles = [];
  for (const v of vehicleData) {
    const { imageUrl, ...vehicleFields } = v;
    const vehicle = await prisma.vehicle.create({
      data: vehicleFields,
    });

    // Primary image
    await prisma.vehicleImage.create({
      data: {
        vehicleId: vehicle.id,
        imageUrl,
        isPrimary: true,
        caption: `${v.make} ${v.model} Front View`,
      },
    });

    // Documents (Insurance & Registration)
    // Scorpio-N (DL01UV1111) set to expire in 4 days for testing alerts
    const isExpiringSoon = v.licensePlate === 'DL01UV1111';
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (isExpiringSoon ? 4 : 240));

    await prisma.vehicleDocument.createMany({
      data: [
        {
          vehicleId: vehicle.id,
          documentType: 'INSURANCE',
          documentNumber: `POL-${v.licensePlate}`,
          documentUrl: 'https://example.com/insurance.pdf',
          issueDate: new Date(Date.now() - 180 * 86400000),
          expiryDate,
          status: isExpiringSoon ? 'PENDING_RENEWAL' : 'ACTIVE',
          notes: isExpiringSoon ? 'Urgent renewal due within 4 days' : 'Zero-dep policy active',
        },
        {
          vehicleId: vehicle.id,
          documentType: 'REGISTRATION',
          documentNumber: `RC-${v.licensePlate}`,
          documentUrl: 'https://example.com/rc.pdf',
          issueDate: new Date(Date.now() - 365 * 86400000),
          expiryDate: new Date(Date.now() + 365 * 86400000),
          status: 'ACTIVE',
        },
      ],
    });

    createdVehicles.push(vehicle);
  }
  console.log(`✅ ${createdVehicles.length} Indian Vehicles seeded (Exactly 1 Luxury Taxi: Mercedes-Benz E-Class)`);

  // 5. Pricing Rules
  await prisma.pricingRule.createMany({
    data: [
      {
        name: 'Standard Indian Fleet Pricing',
        weeklyMultiplier: 0.85, // 15% discount for 7+ days
        weekendMultiplier: 1.15, // 15% surge on Sat/Sun
        seasonalMultiplier: 1.0,
        isActive: true,
      },
      {
        name: 'Monsoon Getaways Surge',
        category: 'SUV',
        weeklyMultiplier: 0.90,
        weekendMultiplier: 1.20,
        seasonalStartDate: new Date('2026-06-01'),
        seasonalEndDate: new Date('2026-09-30'),
        seasonalMultiplier: 1.15,
        isActive: true,
      },
    ],
  });
  console.log('✅ Pricing rules seeded');

  // 6. Promo Codes (in INR)
  const promoCodes = [
    {
      code: 'WELCOME10',
      description: '10% discount on your first rental',
      discountPercent: 10,
      maxDiscount: 1500,
      minBookingAmount: 1000,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      usageLimit: 500,
    },
    {
      code: 'SUMMER20',
      description: '20% discount on summer holiday getaways',
      discountPercent: 20,
      maxDiscount: 2500,
      minBookingAmount: 3000,
      validFrom: new Date('2026-05-01'),
      validUntil: new Date('2026-09-30'),
      usageLimit: 200,
    },
    {
      code: 'FLEET50',
      description: 'Flat 15% discount on executive trips',
      discountPercent: 15,
      maxDiscount: 3500,
      minBookingAmount: 4000,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      usageLimit: 100,
    },
  ];

  const createdPromos = [];
  for (const p of promoCodes) {
    const promo = await prisma.promoCode.create({
      data: p,
    });
    createdPromos.push(promo);
  }
  console.log('✅ Promo codes created');

  // 7. Sample Bookings
  // Past Booking: Swift in Surat completed by John
  const pastStart = new Date(Date.now() - 10 * 86400000);
  const pastEnd = new Date(Date.now() - 7 * 86400000);

  const pastBooking = await prisma.booking.create({
    data: {
      bookingReference: 'BK-2026-IN101',
      customerId: createdUsers['john@example.com'].id,
      vehicleId: createdVehicles[0].id, // Swift
      pickupBranchId: createdBranches[0].id,
      dropBranchId: createdBranches[0].id,
      startDateTime: pastStart,
      endDateTime: pastEnd,
      totalHours: 72,
      totalDays: 3,
      basePrice: 4500,
      discountAmount: 450,
      taxAmount: 405,
      depositAmount: 3000,
      totalPrice: 7455,
      status: 'COMPLETED',
      promoCodeId: createdPromos[0].id,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: pastBooking.id,
      transactionId: 'TXN-IN101-RZP',
      provider: 'RAZORPAY',
      orderId: 'order_in_101',
      paymentId: 'pay_in_101',
      signature: 'valid_test_signature',
      amount: 7455,
      currency: 'INR',
      status: 'CAPTURED',
      method: 'upi',
    },
  });

  await prisma.checkinCheckout.createMany({
    data: [
      {
        bookingId: pastBooking.id,
        staffId: createdUsers['staff@rentfleet.com'].id,
        type: 'PICKUP',
        odometerReading: 18000,
        fuelLevel: 100,
        checklist: JSON.stringify({ tires: true, exterior: true, interior: true, documents: true, clean: true }),
        status: 'COMPLETED',
      },
      {
        bookingId: pastBooking.id,
        staffId: createdUsers['staff@rentfleet.com'].id,
        type: 'RETURN',
        odometerReading: 18500,
        fuelLevel: 100,
        checklist: JSON.stringify({ tires: true, exterior: true, interior: true, documents: true, clean: true }),
        lateFee: 0,
        fuelCharge: 0,
        damageCharge: 0,
        totalAdditionalFee: 0,
        status: 'COMPLETED',
      },
    ],
  });

  await prisma.review.create({
    data: {
      bookingId: pastBooking.id,
      vehicleId: createdVehicles[0].id,
      customerId: createdUsers['john@example.com'].id,
      rating: 5,
      comment: 'Excellent Swift! Super fuel efficient on Surat-Navsari highway. Clean cabin and smooth pickup.',
      reply: 'Thank you John! Glad you enjoyed the drive.',
      isPublished: true,
    },
  });

  // Active Checked-out booking: Pooja Sharma rented Mahindra XUV700 in Mumbai
  const activeStart = new Date(Date.now() - 1 * 86400000);
  const activeEnd = new Date(Date.now() + 2 * 86400000);

  const activeBooking = await prisma.booking.create({
    data: {
      bookingReference: 'BK-2026-IN102',
      customerId: createdUsers['sarah@example.com'].id,
      vehicleId: createdVehicles[9].id, // XUV700
      pickupBranchId: createdBranches[2].id, // Mumbai BKC
      dropBranchId: createdBranches[2].id,
      startDateTime: activeStart,
      endDateTime: activeEnd,
      totalHours: 72,
      totalDays: 3,
      basePrice: 12600,
      discountAmount: 0,
      taxAmount: 1260,
      depositAmount: 3000,
      totalPrice: 16860,
      status: 'CHECKED_OUT',
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: activeBooking.id,
      transactionId: 'TXN-IN102-RZP',
      provider: 'RAZORPAY',
      amount: 16860,
      currency: 'INR',
      status: 'CAPTURED',
      method: 'card',
    },
  });

  await prisma.checkinCheckout.create({
    data: {
      bookingId: activeBooking.id,
      staffId: createdUsers['staff@rentfleet.com'].id,
      type: 'PICKUP',
      odometerReading: 16800,
      fuelLevel: 100,
      checklist: JSON.stringify({ tires: true, exterior: true, interior: true, documents: true, clean: true }),
      damageNotes: 'Clean pre-departure inspection at Mumbai BKC hub',
      status: 'COMPLETED',
    },
  });

  // 8. Maintenance Record for Scorpio-N & Innova Crysta
  await prisma.maintenanceRecord.createMany({
    data: [
      {
        vehicleId: createdVehicles[10].id, // Scorpio-N
        serviceType: 'BRAKE_SERVICE',
        description: 'Scheduled front disc brake pad replacement and fluid check.',
        cost: 4500,
        scheduledDate: new Date(Date.now() - 1 * 86400000),
        status: 'IN_PROGRESS',
        technicianNotes: 'OEM Brembo pads being fitted at Ahmedabad service centre.',
      },
      {
        vehicleId: createdVehicles[13].id, // Innova Crysta
        serviceType: 'OIL_CHANGE',
        description: 'Periodic 30,000 km full engine oil and filter flush.',
        cost: 3200,
        scheduledDate: new Date(Date.now() + 1 * 86400000),
        status: 'SCHEDULED',
        technicianNotes: 'Scheduled at Surat authorized Toyota centre.',
      },
    ],
  });
  console.log('✅ Maintenance records seeded (Scorpio-N and Innova Crysta)');

  // 9. Compliance notification for Scorpio-N
  await prisma.notification.createMany({
    data: [
      {
        userId: createdUsers['manager@rentfleet.com'].id,
        title: '⚠️ Insurance Expiring Soon: Scorpio-N',
        message: 'Vehicle DL01UV1111 insurance policy expires in 4 days. Urgent renewal required.',
        type: 'ALERT',
        channel: 'IN_APP',
        isRead: false,
      },
      {
        userId: createdUsers['admin@rentfleet.com'].id,
        title: 'Weekly Financial Throughput',
        message: 'Gross rental revenue reached Rs 24,315 across Surat, Ahmedabad, Mumbai, and Pune hubs.',
        type: 'INFO',
        channel: 'IN_APP',
        isRead: false,
      },
    ],
  });

  console.log('🎉 Indian Fleet & Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
