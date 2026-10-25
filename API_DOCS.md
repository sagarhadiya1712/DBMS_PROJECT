# 📡 Vehicle Rental & Fleet Management System - API Documentation

Base URL: `http://localhost:5000/api`  
Authentication: HTTP Bearer Token (`Authorization: Bearer <jwt_token>`)

---

## 🔐 1. Authentication Endpoints (`/api/auth`)

### 1.1 POST `/api/auth/signup`
Initiates account registration and generates a 6-digit hashed OTP expiring in 10 minutes.
- **Body**:
  ```json
  {
    "name": "Rahul Verma",
    "phone": "+91 9876543210",
    "email": "rahul@example.com",
    "password": "Password@123"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "message": "Registration initiated. Please verify the 6-digit OTP sent to your email.",
    "email": "rahul@example.com"
  }
  ```

### 1.2 POST `/api/auth/verify-otp`
Validates 6-digit OTP and activates user account.
- **Body**:
  ```json
  {
    "email": "rahul@example.com",
    "otp": "489201"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "message": "Account successfully verified and activated!",
    "token": "eyJhbGciOi...",
    "user": {
      "user_id": 2,
      "name": "Rahul Verma",
      "email": "rahul@example.com",
      "role": "customer",
      "is_verified": 1
    }
  }
  ```

### 1.3 POST `/api/auth/login`
Authenticates existing verified users.
- **Body**:
  ```json
  {
    "email": "admin@rental.com",
    "password": "Admin@123"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOi...",
    "user": {
      "user_id": 1,
      "name": "Fleet Admin",
      "email": "admin@rental.com",
      "role": "admin"
    }
  }
  ```

---

## 🚗 2. Vehicle Endpoints (`/api/vehicles`)

### 2.1 GET `/api/vehicles`
List fleet vehicles with filters, sorting, and availability check.
- **Query Parameters**:
  - `category`: Hatchback | Sedan | SUV | MUV | Luxury
  - `fuel_type`: Petrol | Diesel | CNG | Hybrid
  - `seats`: 4, 5, 7
  - `min_price`, `max_price`: Numeric INR values
  - `start_datetime`, `end_datetime`: ISO-8601 timestamps (filters out reserved cars)
  - `sort`: `price_asc` | `price_desc` | `rating`

### 2.2 GET `/api/vehicles/:id`
Retrieves vehicle details, assigned driver, average rating, customer reviews, and booked calendar ranges.

### 2.3 POST `/api/vehicles` (Admin)
Creates new vehicle in fleet.

### 2.4 PATCH `/api/vehicles/:id/status` (Admin)
Updates operational status: `'Available'`, `'Rented'`, or `'In Service'`.

---

## 📑 3. Bookings (`/api/bookings`)

### 3.1 POST `/api/bookings`
Creates a reservation inside an atomic database transaction. **Prevents double booking**.
- **Body**:
  ```json
  {
    "vehicle_id": 1,
    "start_datetime": "2026-11-01T10:00:00.000Z",
    "end_datetime": "2026-11-04T10:00:00.000Z",
    "pricing_type": "day",
    "discount_code": "WELCOME10"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "booking_id": 6,
    "user_id": 2,
    "vehicle_id": 1,
    "base_amount": 5400,
    "discount_amount": 540,
    "deposit_amount": 3000,
    "total_amount": 4860,
    "status": "Pending"
  }
  ```
- **Conflict Error** (409 Conflict):
  ```json
  {
    "error": "Schedule conflict: Vehicle is already reserved for overlapping dates."
  }
  ```

### 3.2 PATCH `/api/bookings/:id/complete` (Admin)
Completes return, computes late return penalty, and restores vehicle status to `'Available'`.

---

## 💳 4. Payments (`/api/payments`)

### 4.1 POST `/api/payments/create-order`
Creates Razorpay test order.

### 4.2 POST `/api/payments/verify`
Verifies HMAC-SHA256 test signature and transitions booking to `'Approved'`.

### 4.3 GET `/api/payments/invoice/:bookingId`
Streams generated PDF Tax Invoice (`pdfkit`).

---

## 🛠️ 5. Fleet, Alerts & Reports

- `GET /api/fleet/alerts`: Returns items with service, insurance, or permit expiring in ≤15 days.
- `GET /api/admin/stats`: Overview KPIs.
- `GET /api/reports/revenue?range=daily|monthly`: Revenue aggregation.
- `GET /api/reports/export?type=excel|pdf`: Multi-sheet Excel export or summary PDF.
- `POST /api/reviews`: Submit 1-5 star review on completed bookings.
