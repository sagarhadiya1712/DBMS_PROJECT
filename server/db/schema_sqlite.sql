-- Vehicle Rental & Fleet Management System
-- SQLite Schema (Foreign Keys ON, Strict Constraints, Indexes)

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT CHECK(role IN ('customer', 'admin')) DEFAULT 'customer',
    is_verified INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    google_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Email OTPs table
CREATE TABLE IF NOT EXISTS email_otps (
    otp_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0
);

-- 3. Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT CHECK(category IN ('Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury')) NOT NULL,
    fuel_type TEXT NOT NULL,
    transmission TEXT NOT NULL,
    seats INTEGER NOT NULL,
    price_per_day REAL NOT NULL,
    price_per_hour REAL NOT NULL,
    price_per_km REAL NOT NULL,
    security_deposit REAL NOT NULL,
    status TEXT CHECK(status IN ('Available', 'Rented', 'In Service')) DEFAULT 'Available',
    image_url TEXT,
    is_chauffeur_driven INTEGER DEFAULT 0,
    insurance_expiry DATE,
    permit_expiry DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    pricing_type TEXT CHECK(pricing_type IN ('day', 'hour', 'km')) DEFAULT 'day',
    total_amount REAL NOT NULL,
    deposit_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    late_fee REAL DEFAULT 0,
    status TEXT CHECK(status IN ('Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Cancelled')) DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    method TEXT DEFAULT 'Razorpay',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    payment_status TEXT CHECK(payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')) DEFAULT 'Pending',
    paid_at DATETIME
);

-- 6. Maintenance records table
CREATE TABLE IF NOT EXISTS maintenance (
    maintenance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    cost REAL NOT NULL,
    next_due_date DATE,
    notes TEXT
);

-- 7. Fuel records table
CREATE TABLE IF NOT EXISTS fuel_records (
    fuel_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    litres REAL NOT NULL,
    cost REAL NOT NULL
);

-- 8. Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    driver_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    license_no TEXT NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL
);

-- 9. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE SET NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Discounts table
CREATE TABLE IF NOT EXISTS discounts (
    discount_id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    percent REAL NOT NULL,
    valid_from DATE,
    valid_to DATE,
    active INTEGER DEFAULT 1
);

-- 11. Vehicle Documents table
CREATE TABLE IF NOT EXISTS vehicle_documents (
    doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    file_url TEXT,
    expiry_date DATE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_dates ON bookings(vehicle_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON vehicle_documents(vehicle_id);
