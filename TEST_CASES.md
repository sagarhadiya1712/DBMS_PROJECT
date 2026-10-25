# 🧪 Test Cases & Verification Report

**Project**: Vehicle Rental & Fleet Management System  
**Engine**: Jest + Supertest (Integration Suite) + Better-SQLite3  
**Execution Timestamp**: October 2026  
**Status**: 15 / 15 Passed (100% Pass Rate)

---

## 📋 Comprehensive Test Cases Table

| # | Test Case Description | Test Input / Action | Expected Result | Actual Result | Status |
|---|-----------------------|---------------------|-----------------|---------------|:------:|
| **1** | Admin Authentication | `POST /api/auth/login` with `admin@rental.com` / `Admin@123` | HTTP 200, JWT token returned, role = `'admin'` | Token returned, role = admin | **PASS** |
| **2** | Customer Signup Flow | `POST /api/auth/signup` with name, phone, email, password | HTTP 201, unverified user created, 6-digit OTP generated | HTTP 201, 6-digit OTP created | **PASS** |
| **3** | Unverified User Block Guard | `POST /api/auth/login` before verifying OTP | HTTP 403 Forbidden with `unverified: true` flag | HTTP 403 Forbidden, `unverified: true` | **PASS** |
| **4** | 6-Digit Email OTP Verification | `POST /api/auth/verify-otp` with valid 6-digit code | HTTP 200, user marked `is_verified: 1`, JWT token issued | HTTP 200, `is_verified: 1`, JWT issued | **PASS** |
| **5** | Fleet Listing & Rating Computation | `GET /api/vehicles` | HTTP 200, returns array of 14 vehicles with computed ratings | HTTP 200, 14 vehicles with ratings | **PASS** |
| **6** | Segment Category Filtering | `GET /api/vehicles?category=Sedan` | HTTP 200, returns only Sedan models (City, Dzire, Verna) | All returned items are Sedans | **PASS** |
| **7** | Booking Creation & Promo Voucher | `POST /api/bookings` with `pricing_type='day'` & voucher `'WELCOME10'` | HTTP 201, 10% discount applied to rental fee | HTTP 201, discount deducted accurately | **PASS** |
| **8** | **Strict Zero Double-Booking Guard** | `POST /api/bookings` for same vehicle with overlapping date range | **HTTP 409 Conflict**, Schedule conflict error message returned | **HTTP 409 Conflict**, rejected atomically in DB transaction | **PASS** |
| **9** | Razorpay Test Order Generation | `POST /api/payments/create-order` with `booking_id` | HTTP 200, order ID & amount in paise returned | HTTP 200, Razorpay test order ID generated | **PASS** |
| **10** | Razorpay Signature Verification | `POST /api/payments/verify` with order ID & signature | HTTP 200, payment marked `'Paid'`, booking approved | HTTP 200, booking transitioned to `'Approved'` | **PASS** |
| **11** | PDF Tax Invoice Streaming | `GET /api/payments/invoice/:bookingId` | HTTP 200, `Content-Type: application/pdf`, stream itemized invoice | HTTP 200, application/pdf streamed | **PASS** |
| **12** | Admin Return & Late Fee Calculation | `PATCH /api/bookings/:id/complete` with return time & extra charges | HTTP 200, booking status `'Completed'`, late fee added, vehicle freed | HTTP 200, status `'Completed'`, vehicle `'Available'` | **PASS** |
| **13** | Customer Review on Completed Trip | `POST /api/reviews` with rating 1-5 & feedback comment | HTTP 201, review stored and linked to vehicle | HTTP 201, 5-star review saved | **PASS** |
| **14** | Fleet Expiry Compliance Alerts | `GET /api/fleet/alerts` (Admin) | HTTP 200, items expiring within 15 days flagged with urgency | HTTP 200, urgent items detected | **PASS** |
| **15** | Multi-Sheet Excel Analytics Export | `GET /api/reports/export?type=excel` (Admin) | HTTP 200, spreadsheetml workbook with Revenue, Most Booked, Idle Fleet | HTTP 200, ExcelJS workbook streamed | **PASS** |

---

## 🔒 Verification of Double-Booking Concurrency Safety
The double-booking prevention runs inside a strict SQLite transaction:
```javascript
const transaction = db.transaction(() => {
  const conflict = db.prepare(`
    SELECT booking_id FROM bookings
    WHERE vehicle_id = ?
      AND status IN ('Pending', 'Approved', 'Active')
      AND NOT (end_datetime <= ? OR start_datetime >= ?)
  `).get(vehicle_id, start_datetime, end_datetime);

  if (conflict) {
    const err = new Error('Schedule conflict...');
    err.statusCode = 409;
    throw err;
  }
  // Insert booking...
});
```
Any overlapping interval triggers an immediate transaction abort and HTTP 409 error response, guaranteeing zero double-bookings under concurrent client requests.
