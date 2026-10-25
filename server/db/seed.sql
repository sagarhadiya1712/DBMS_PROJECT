-- ====================================================================
-- Vehicle Rental & Fleet Management System
-- Oracle Database 23ai / PL/SQL Seed Data
-- Designed for execution in VS Code (Connection: DBMS_PROJ)
-- ====================================================================

-- 1. Users (Admin: admin@rental.com / Admin@123, 2 Demo Customers)
INSERT INTO users (name, phone, email, password_hash, role, is_verified, is_blocked)
VALUES ('Fleet Admin', '+91 9876543210', 'admin@rental.com', '$2a$10$tZ2M9pUv58bJ0s981gQ5r.r2M7aIuX5u1M80v15i27gM1y1.54i0.', 'admin', 1, 0);

INSERT INTO users (name, phone, email, password_hash, role, is_verified, is_blocked)
VALUES ('Rahul Verma', '+91 9811223344', 'customer@rental.com', '$2a$10$vN4.tqC7U1YjZ7U9mY2Qp.4K2HhL8jT1F5f9u1G3y2m3X5z7a9c1.', 'customer', 1, 0);

INSERT INTO users (name, phone, email, password_hash, role, is_verified, is_blocked)
VALUES ('Priya Sharma', '+91 9822334455', 'priya@example.com', '$2a$10$vN4.tqC7U1YjZ7U9mY2Qp.4K2HhL8jT1F5f9u1G3y2m3X5z7a9c1.', 'customer', 1, 0);

-- 2. 14 Realistic Indian Fleet Vehicles
INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Swift ZXi', 'Maruti Suzuki', 'Hatchback', 'Petrol', 'Manual', 5, 1800, 150, 14, 3000, 'Available', '/vehicles/maruti-suzuki-swift.jpg', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('i20 Asta (O)', 'Hyundai', 'Hatchback', 'Petrol', 'Automatic', 5, 2200, 180, 15, 3500, 'Available', 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1000&q=80', 0, SYSDATE + 5, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Tiago XZ+', 'Tata', 'Hatchback', 'Petrol', 'Manual', 5, 1600, 130, 12, 2500, 'Available', '/vehicles/tata-tiago.jpg', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('City ZX', 'Honda', 'Sedan', 'Petrol', 'Automatic', 5, 3200, 260, 18, 5000, 'Available', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Dzire VXi', 'Maruti Suzuki', 'Sedan', 'CNG', 'Manual', 5, 2300, 190, 13, 3500, 'Available', '/vehicles/maruti-suzuki-dzire.jpg', 0, SYSDATE + 300, SYSDATE + 12);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Verna SX (O)', 'Hyundai', 'Sedan', 'Petrol', 'Automatic', 5, 3400, 280, 19, 5000, 'Available', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1000&q=80', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('XUV700 AX7 Luxury', 'Mahindra', 'SUV', 'Diesel', 'Automatic', 7, 4800, 390, 24, 7000, 'Available', '/vehicles/mahindra-xuv700.jpg', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Nexon Fearless+ S', 'Tata', 'SUV', 'Diesel', 'Manual', 5, 2800, 220, 16, 4000, 'Available', '/vehicles/tata-nexon.jpg', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Ertiga ZXi', 'Maruti Suzuki', 'MUV', 'Petrol', 'Manual', 7, 3000, 240, 17, 4500, 'Available', '/vehicles/maruti-suzuki-ertiga.jpg', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Innova Crysta 2.4 VX', 'Toyota', 'MUV', 'Diesel', 'Automatic', 7, 4500, 360, 22, 6000, 'Available', '/vehicles/toyota-innova-crysta.jpg', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Thar 4x4 Hard Top', 'Mahindra', 'SUV', 'Diesel', 'Manual', 4, 4200, 340, 22, 6000, 'Available', '/vehicles/mahindra-thar.jpg', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Creta SX (O)', 'Hyundai', 'SUV', 'Petrol', 'Automatic', 5, 3500, 290, 19, 5000, 'Available', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80', 0, SYSDATE + 300, SYSDATE + 400);

INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Punch Creative Flagship', 'Tata', 'SUV', 'Petrol', 'Manual', 5, 2100, 170, 14, 3000, 'Available', '/vehicles/tata-punch.jpg', 0, SYSDATE + 300, SYSDATE + 400);

-- Luxury (Chauffeur-driven hybrid)
INSERT INTO vehicles (name, brand, category, fuel_type, transmission, seats, price_per_day, price_per_hour, price_per_km, security_deposit, status, image_url, is_chauffeur_driven, insurance_expiry, permit_expiry)
VALUES ('Innova Hycross ZX(O) Hybrid', 'Toyota', 'Luxury', 'Petrol Hybrid', 'Automatic', 7, 6500, 550, 30, 10000, 'Available', 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80', 1, SYSDATE + 300, SYSDATE + 400);

-- 3. Drivers
INSERT INTO drivers (name, phone, license_no, vehicle_id)
VALUES ('Rajesh Sharma (Senior Chauffeur)', '+91 9765432109', 'DL-0420180098765', 14);

INSERT INTO drivers (name, phone, license_no, vehicle_id)
VALUES ('Sunil Kumar (Relief Chauffeur)', '+91 9711224466', 'MH-0220200054321', NULL);

-- 4. Discounts
INSERT INTO discounts (code, percent, valid_from, valid_to, active)
VALUES ('WELCOME10', 10, TO_DATE('2026-01-01', 'YYYY-MM-DD'), TO_DATE('2027-12-31', 'YYYY-MM-DD'), 1);

INSERT INTO discounts (code, percent, valid_from, valid_to, active)
VALUES ('FLEET20', 20, TO_DATE('2026-01-01', 'YYYY-MM-DD'), TO_DATE('2027-12-31', 'YYYY-MM-DD'), 1);

-- 5. Bookings & Payments
INSERT INTO bookings (user_id, vehicle_id, start_datetime, end_datetime, pricing_type, total_amount, deposit_amount, discount_amount, late_fee, status)
VALUES (2, 1, SYSDATE - 10, SYSDATE - 7, 'day', 5400, 3000, 0, 0, 'Completed');

INSERT INTO payments (booking_id, amount, method, razorpay_order_id, razorpay_payment_id, payment_status, paid_at)
VALUES (1, 5400, 'Razorpay', 'order_demo_101', 'pay_demo_101', 'Paid', SYSDATE - 10);

INSERT INTO bookings (user_id, vehicle_id, start_datetime, end_datetime, pricing_type, total_amount, deposit_amount, discount_amount, late_fee, status)
VALUES (2, 4, SYSDATE - 1, SYSDATE + 2, 'day', 9600, 5000, 960, 0, 'Active');

INSERT INTO payments (booking_id, amount, method, razorpay_order_id, razorpay_payment_id, payment_status, paid_at)
VALUES (2, 9600, 'Razorpay', 'order_demo_102', 'pay_demo_102', 'Paid', SYSDATE - 1);

-- 6. Reviews
INSERT INTO reviews (user_id, vehicle_id, booking_id, rating, comment)
VALUES (2, 1, 1, 5, 'Super smooth experience! The Swift was spotless, fuel efficient, and pickup was hassle free.');

-- 7. Maintenance Records
INSERT INTO maintenance (vehicle_id, service_date, cost, next_due_date, notes)
VALUES (1, TO_DATE('2026-08-10', 'YYYY-MM-DD'), 4200, SYSDATE + 300, 'Periodic 20,000 km general service, synthetic oil change and wheel alignment');

INSERT INTO maintenance (vehicle_id, service_date, cost, next_due_date, notes)
VALUES (4, TO_DATE('2026-09-01', 'YYYY-MM-DD'), 5800, SYSDATE + 7, 'Brake pad replacement and AC disinfection (Next general checkup due in 7 days)');

-- 8. Fuel Records
INSERT INTO fuel_records (vehicle_id, date, litres, cost)
VALUES (1, TO_DATE('2026-10-10', 'YYYY-MM-DD'), 35, 3600);

-- 9. Vehicle Documents
INSERT INTO vehicle_documents (vehicle_id, doc_type, file_url, expiry_date)
VALUES (1, 'Insurance Policy', 'https://example.com/docs/swift_ins.pdf', SYSDATE + 300);

INSERT INTO vehicle_documents (vehicle_id, doc_type, file_url, expiry_date)
VALUES (2, 'Comprehensive Insurance', 'https://example.com/docs/i20_ins.pdf', SYSDATE + 5);

COMMIT;
