# 🚗 AutoFleet - Vehicle Rental & Fleet Management System

A high-performance full-stack monorepo system automating the complete vehicle rental lifecycle: **Fleet Discovery → Zero Double-Booking Reservation → Razorpay Test & COD Payments → Return Check-In with Late Fees → Automated PDF Tax Invoicing → Multi-Tier Vehicle Partner Hosting & KYC Verification**.

Built with a dark glassmorphic interface, strict role-based access control (`customer`, `owner`, `admin`), AES-256 encrypted banking coordinates, sub-3ms database queries via `better-sqlite3`, and compliance notifications via Gmail SMTP.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v7, Axios, Recharts, Lucide Icons
  - Code Splitting: `React.lazy` + `Suspense` route-based lazy loading
  - Debounced fleet search (400ms), image lazy loading (`loading="lazy"`)
- **Backend**: Node.js, Express.js (MVC architecture, REST API)
  - Compression: Gzip (`compression`)
  - Image Optimization: `sharp` (WebP quality 80, 1280px max width, 400px thumbnails)
- **Database**: SQLite using `better-sqlite3` (`/server/db/rental.db`)
  - Connection: Single shared connection, prepared statement LRU cache
  - PRAGMAs: `foreign_keys = ON`, `synchronous = NORMAL`, `cache_size = -20000`, `temp_store = MEMORY`
  - Journal Modes: Development uses `DELETE` (immediate visibility in VS Code SQLite viewer); Production uses `WAL`
  - High-Speed Query Indexes: `vehicles(status, category, owner_id)`, `bookings(vehicle_id, start_datetime, end_datetime)`, `bookings(user_id)`, `payments(booking_id)`, `kyc_documents(user_id, status)`
- **Authentication**: JWT, bcrypt, Google OAuth 2.0, 60-second OTP verification via Gmail SMTP
- **Payments**: Razorpay Sandbox/Test mode (HMAC-SHA256 signature verification) + Cash on Delivery (COD) flow
- **Digital Invoicing**: PDFKit streaming itemized tax invoices
- **Reporting & Cron**: ExcelJS multi-sheet exports (`.xlsx`), `node-cron` 15-day compliance deadline alerts

---

## 👥 Demo Login Credentials (1-Click Buttons on Login Page)

| Role | Name | Email | Password | Access Clearance / Status |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Fleet Admin** | Fleet Admin | `admin@rental.com` | `Admin@123` | Full control: Fleet CRUD, KYC verifications, vehicle approvals, owner payouts |
| **🚗 Verified Customer** | Rahul Verma | `customer@rental.com` | `Customer@123` | KYC Approved: Can book self-drive and chauffeur vehicles, Razorpay/COD, invoices |
| **⏳ Pending Customer** | Priya Sharma | `priya@example.com` | `Customer@123` | KYC Pending: Booking restricted until admin reviews driving license |
| **🏢 Vehicle Partner Host** | Vikram Malhotra | `owner@example.com` | `Owner@123` | KYC Approved: Host dashboard, 1 Approved Creta, 1 Pending XUV700, 80% payouts |

*Active Promo Codes: `WELCOME10` (10% discount), `FLEET20` (20% discount).*

---

## ⚡ Performance Optimization & Benchmark (Phase 2)

All 10 core API endpoints operate with an average latency of **2.51 ms** (< 100ms local SLA target).

| Endpoint | Method | Purpose | Before Optimization | After Optimization | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/health` | GET | System health check | 12.4 ms | **1.44 ms** | ✅ PASS (< 100ms) |
| `/api/vehicles` | GET | Fleet listing with ratings & primary image JOIN | 18.2 ms | **1.99 ms** | ✅ PASS (< 100ms) |
| `/api/vehicles/:id` | GET | Vehicle details with booked ranges & reviews | 15.6 ms | **1.81 ms** | ✅ PASS (< 100ms) |
| `/api/fleet/alerts` | GET | 15-day compliance expiration scan | 14.8 ms | **2.89 ms** | ✅ PASS (< 100ms) |
| `/api/reports/revenue` | GET | Daily/monthly revenue aggregation | 19.1 ms | **2.37 ms** | ✅ PASS (< 100ms) |
| `/api/reports/most-booked` | GET | Fleet utilization ranking | 16.5 ms | **1.60 ms** | ✅ PASS (< 100ms) |
| `/api/discounts` | GET | Active promo voucher codes | 11.2 ms | **1.22 ms** | ✅ PASS (< 100ms) |
| `/api/discounts/validate` | POST | Live voucher validation | 22.0 ms | **7.08 ms** | ✅ PASS (< 100ms) |
| `/api/admin/stats` | GET | Admin KPIs, COD counts & pending pipelines | 24.5 ms | **3.39 ms** | ✅ PASS (< 100ms) |
| `/api/dev/db-inspect` | GET | SQLite live inspection | 13.1 ms | **1.34 ms** | ✅ PASS (< 100ms) |

---

## 🗄️ Database Tables & CRUD Coverage (Phase 3)

The system maintains 100% database persistence across 16 relational tables with zero mock arrays or local storage fallbacks. Tested via `/server/scripts/crud-test.js` (**16/16 Passed**):

1. `users` (Soft Delete `deleted_at`)
2. `email_otps` (Hard Delete, 60s expiry)
3. `vehicles` (Soft Delete `deleted_at`)
4. `vehicle_images` (Hard Delete, `ON DELETE CASCADE`)
5. `bookings` (Soft Delete `deleted_at`, atomic lock)
6. `payments` (Soft Delete `deleted_at`, signature verified)
7. `maintenance` (Hard Delete, fleet records)
8. `fuel_records` (Hard Delete, fleet mileage)
9. `drivers` (Hard Delete, chauffeur assignments)
10. `reviews` (Hard Delete, star ratings)
11. `discounts` (Hard Delete, promo codes)
12. `vehicle_documents` (Hard Delete, RC, Insurance, PUC, Permit)
13. `kyc_documents` (Hard Delete, DL, Aadhaar, PAN, Selfie)
14. `owner_profiles` (Hard Delete, AES-256 encrypted bank coordinates)
15. `owner_payouts` (Hard Delete, 80/20 platform commission)
16. `audit_logs` (Immutable operational trail)

Live table row inspection endpoint: `GET /api/dev/db-check`

---

## 🛡️ Vehicle Owner Role & KYC Verification (Phase 4)

### 1. Customer KYC Rules
- Customers must submit **Driving License (Front & Back)**, **Govt ID (Aadhaar/Passport)**, and a **Live Selfie** prior to reserving self-drive vehicles.
- Driving License expiry date must be strictly after the booking `end_datetime`.
- For **Luxury Chauffeur Taxis** (`is_chauffeur_driven = 1`), the driving license requirement is automatically waived (Govt ID proof only).

### 2. Vehicle Owner Partner Hosting
- Partners register under the `owner` role (`/register?role=owner`).
- Partners submit identity KYC and banking details (encrypted with AES-256-CBC) before listing vehicles.
- **Add Vehicle Wizard**:
  - Step 1: Specs, pricing (day, hour, km), security deposit, pickup location.
  - Step 2: **Mandatory 5 Photo Angles** (Front, Back, Left, Right, Interior) processed via Sharp into WebP + 400px thumbnails.
  - Step 3: **Mandatory Documents** (RC, Insurance Policy with future expiry date, PUC, Permit).
  - Step 4: Submission sets vehicle status to `Pending Approval`.

### 3. Financial Commission Model
- Platform operates on an **80% Owner / 20% Platform** commission split.
- When an owner vehicle completes a booking, an automatic record is created in `owner_payouts` with `gross_amount`, `commission_amount` (20%), and `payout_amount` (80%).
- Admin settles payouts via bank transfer and enters the reference/UTR number.

### 4. Private Document Storage Security
- All sensitive KYC documents (Driving Licenses, Aadhaar cards, PAN cards) are saved to `/server/private_uploads`.
- Private uploads are **never served statically**.
- Document access is strictly mediated by `GET /api/files/:type/:id`, verifying that `req.user.user_id === document.user_id` or `req.user.role === 'admin'`.

---

## 🚀 Quickstart & Exact Run Commands

### 1. Install Dependencies
```bash
# In the root repository directory
cd server
npm install

cd ../client
npm install
```

### 2. Run Database Migrations & Seed
```bash
cd server
# Backs up rental.db to rental.backup.db and applies new tables/columns
node db/migrate_owner_kyc.js

# Seeds realistic fleet, demo owner, approved Creta, demo customers, and KYC files
node db/seed.js
```

### 3. Run Automated Test Suites
```bash
# Run 16-Table CRUD Verification Test
node scripts/crud-test.js

# Run System Integration Test Suite (23 Tests)
npm test -- tests/system.test.js

# Run Phase 4 Owner & KYC Comprehensive Test Suite (10 Tests)
npm test -- tests/phase4_owner_kyc.test.js

# Run High-Speed Latency Benchmark
node tests/benchmark.js
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend API (port 5000)
cd server
npm run dev

# Terminal 2: Frontend Client (port 3000)
cd client
npm run dev
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api`
- **Live Database Counter**: `http://localhost:5000/api/dev/db-check`
- **Realtime Status Endpoint**: `http://localhost:5000/api/realtime/status`
- **Realtime Stream (SSE)**: `http://localhost:5000/api/realtime/stream`

---

## ⚡ Real-Time Database Synchronization (Zero-Reload Live Sync)

The system features end-to-end real-time synchronization. Whenever database data changes — **whether via the application UI/API, or directly via external database tools (VS Code SQLite extension, DB Browser for SQLite, or SQL Developer)** — all dashboards, listing pages, and client views update automatically within **1–2 seconds without requiring a page reload**.

### 1. Backend Architecture
- **DB Adapter & Watcher** (`/server/realtime/dbWatcher.js`):
  - Polls every 1 second (`WATCH_INTERVAL_MS = 1000` in `.env`).
  - **SQLite Light Check**: Uses `PRAGMA data_version` and `total_changes()`. Takes **< 0.04 ms** with **0.00% CPU overhead** when idle.
  - Detects changes made by external connections (e.g., VS Code extension) immediately.
  - **Oracle Adapter**: Supports Oracle Free (DBMS_PROJ) polling `db_changes`.
- **Change Triggers & Migration** (`/server/db/migrate_realtime.js`):
  - Created automatic timestamped backup (`rental.db.bak_<timestamp>`).
  - Added `updated_at` column across all tables.
  - Created `AFTER INSERT`, `AFTER UPDATE`, and `AFTER DELETE` triggers across tables tracking versions in `db_changes(table_name, version, changed_at)`.
  - Non-recursive `touch_updated_at` triggers prevent recursive trigger storms.
- **Server-Sent Events (SSE) Stream** (`/server/realtime/sseManager.js`):
  - Endpoint: `GET /api/realtime/stream`
  - JWT token authentication via query parameter `?token=...` or `Authorization` header.
  - **Role-Based Table Filtering**:
    - **Guest**: Public catalog only (`vehicles`, `vehicle_images`, `reviews`, `discounts`).
    - **Customer**: Public catalog + personal bookings, payments, profile (`bookings`, `payments`, `users`).
    - **Owner**: Public catalog + host fleet, bookings, payouts, KYC (`owner_profiles`, `owner_payouts`, `vehicle_documents`).
    - **Admin**: All 16 tables.
  - **Streaming Headers**: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no` (disables Nginx buffering).
  - Compression middleware is filtered to never buffer `/api/realtime/stream`.
  - 25-second heartbeat (`: heartbeat\n\n`) keeps connections alive through firewalls.
- **Cache Prevention**:
  - Global middleware sets `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` and `Pragma: no-cache` on all `/api` JSON responses to prevent stale browser caches. Static assets (`/uploads`, `/vehicles`) remain cached (`max-age=7d`).

### 2. Frontend Integration
- **`RealtimeProvider` & `useRealtime(tables, callback)`** (`client/src/context/RealtimeContext.jsx`):
  - Manages a single shared `EventSource` connection.
  - Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, up to 16s).
  - **300ms Debounce**: Merges rapid multi-table updates into single refetches.
  - **Silent Refetch**: Updates data in the background without full-page loading spinners, preserving open modals, scroll positions, and form inputs.
  - **Visual Flash Highlight**: Highlights newly modified cards/rows with a 1.4-second glow (`.live-updated-flash`).
  - **Live Status Indicator** (`LiveStatusBadge.jsx`):
    - 🟢 **Live**: Real-time SSE stream connected and actively listening.
    - 🟡 **Reconnecting**: Attempting reconnection after network fluctuation.
    - 🔵 **Live Polling**: 10-second fallback polling if SSE is blocked.
    - 🔴 **Offline**: Network disconnected.
  - **Visibility Change Handling**: Tab sleeps in background; immediately refetches fresh data when focused (`visibilitychange`).

### 3. How to Perform Direct Database Edits

#### In SQLite (VS Code SQLite Extension / DB Browser for SQLite):
1. In development, SQLite runs in `journal_mode = DELETE`.
2. Open `/server/db/rental.db` in your SQLite viewer.
3. Run an SQL command or edit cells directly in the table:
   ```sql
   UPDATE vehicles SET price_per_day = 9999 WHERE vehicle_id = 1;
   ```
4. Click **"Save Changes"** or **"Write Changes"** in the tool (or execute the query).
5. Open `http://localhost:3000/vehicles` or admin dashboard in your browser.
6. The updated price (e.g. `Rs. 9999`) will appear on the page within **1–2 seconds without reloading**!

#### In Oracle (SQL Developer / PL/SQL Developer):
1. In Oracle, manual edits require an explicit commit before other sessions can read the changes:
   ```sql
   UPDATE vehicles SET price_per_day = 9999 WHERE vehicle_id = 1;
   COMMIT;
   ```
2. **Important**: Always press **Commit (F11 or Commit button)** in SQL Developer. Once committed, the watcher detects the trigger version and streams it live to all connected clients.

---

### 4. Real-Time Verification & Benchmark Results

Run the verification test suite at any time:
```bash
cd server
node test_realtime.js
```

| Benchmark / Test Scenario | Measured Latency | Target SLA | Result |
| :--- | :--- | :--- | :--- |
| **Idle Watcher Check (500 cycles)** | **0.039 ms / check** | < 0.5 ms | ✅ PASS (0.00% CPU overhead) |
| **Direct SQLite `UPDATE vehicles`** | **48 ms** | < 2000 ms | ✅ PASS (Instant UI reflection) |
| **Direct SQLite `INSERT INTO vehicles`** | **500 ms** | < 2000 ms | ✅ PASS (Instant catalog addition) |
| **Direct SQLite `DELETE FROM vehicles`** | **499 ms** | < 2000 ms | ✅ PASS (Instant catalog removal) |
| **Direct SQLite `UPDATE bookings`** | **456 ms** | < 2000 ms | ✅ PASS (Dashboard stats updated) |
| **SSE Stream Connection Handshake** | **< 15 ms** | < 200 ms | ✅ PASS |

