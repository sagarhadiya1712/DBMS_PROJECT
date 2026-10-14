# 🚗 Vehicle Rental & Fleet Management System (Monorepo)

A production-ready, full-stack monorepo system designed to digitize the complete vehicle rental lifecycle: **Search → Real-time Booking → Razorpay Test Payment → Digital Pickup Check-Out → Return Check-In & Penalty Calculation → PDF Invoicing**.

Built with guaranteed **zero double-bookings**, role-based access control (RBAC), automated compliance/service expiration alerts via `node-cron`, and executive analytics powered by Recharts.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v7, Axios, Lucide Icons, Recharts
- **Backend**: Node.js, Express, REST API
- **Database**: PostgreSQL with Prisma ORM (includes dual-mode zero-dependency local SQLite fallback)
- **Authentication**: JWT (Access Token 15m + Refresh Token 7d with bcrypt rotation), Role-Based Access Control (RBAC)
- **Payment Gateway**: Razorpay in Sandbox/Test Mode with HMAC-SHA256 signature verification (modular provider ready for Stripe)
- **File Uploads**: Multi-part upload handler (saving to local `/uploads` or Cloudinary)
- **Automated Cron**: `node-cron` scanning daily for vehicle insurance, registration, and service deadlines
- **Digital Invoicing**: PDFKit streaming itemized tax invoices
- **Reporting**: Excel (`xlsx`) and PDF summary exports
- **DevOps**: `docker-compose.yml` (PostgreSQL + Server + Client), `Dockerfile.server`, `Dockerfile.client`, `.env.example`
- **Testing**: Jest + Supertest test suite

---

## 👥 Demo Login Credentials (1-Click Buttons Available on Login Page)

| Role | Email | Password | Access Clearance |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@rentfleet.com` | `Password123!` | Full system command, KPI dashboards, users, pricing & audit trail |
| **💼 Manager** | `manager@rentfleet.com` | `Password123!` | Fleet management, branch pricing rules, maintenance scheduling |
| **🔧 Staff** | `staff@rentfleet.com` | `Password123!` | Front-desk operations, pickup/return condition inspections |
| **🚗 Customer** | `john@example.com` | `Password123!` | Explore fleet, reserve vehicles, Razorpay payment, download invoices |
| **🚗 Customer** | `sarah@example.com` | `Password123!` | Customer account with active on-road rental |

*Active Promo Codes: `WELCOME10` (10% off), `SUMMER20` (20% off), `FLEET50` (15% off).*

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (optional, for multi-container deployment)

### 2. Environment Setup
Copy the environment template:
```bash
cp .env.example server/.env
```

### 3. Running with Docker Compose (PostgreSQL + App)
```bash
docker-compose up --build
```
- Client Web App: `http://localhost:3000`
- REST API Server: `http://localhost:5000/api`

### 4. Running Directly via Node.js

#### Backend Setup
```bash
cd server
npm install
npx prisma db push --schema=prisma/schema.sqlite.prisma
node prisma/seed.js
npm run dev
```
Backend will start on `http://localhost:5000` (API: `http://localhost:5000/api`).

#### Frontend Setup
```bash
cd client
npm install
npm run dev
```
Frontend will start on `http://localhost:3000` (or `http://localhost:3001` if 3000 is occupied).

---

## 🧪 Testing & Verification

### Running Automated Test Suite
From the `/server` folder, execute Jest and Supertest:
```bash
cd server
npm test
```
**Test Coverage Includes:**
- User registration, login, and JWT token refresh
- RBAC protection (Customer 403 blocks on Admin endpoints, Admin 200 pass)
- **Zero Double-Booking Guard**: Strict date overlap conflict rejection (`409 Conflict`)
- Dynamic price quote calculation with promo vouchers
- Razorpay test mode payment capture and signature verification

---

## 📑 API Endpoints Summary

A complete Postman Collection is included at [`postman_collection.json`](file:///d:/vehicle-rental-system/postman_collection.json).

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create customer account
- `POST /api/auth/login` - Authenticate & receive access/refresh tokens
- `POST /api/auth/refresh` - Rotate access token
- `GET /api/auth/profile` - Current user details
- `PUT /api/auth/profile` - Update details
- `POST /api/auth/upload-license` - Upload driver license photo
- `POST /api/auth/logout` - Revoke refresh token

### Fleet & Vehicles (`/api/vehicles`)
- `GET /api/vehicles` - Search with filters (category, seats, branch, price, date availability)
- `GET /api/vehicles/:id` - Full vehicle details, photos, and calendar availability
- `POST /api/vehicles` - Add vehicle to fleet (Staff/Admin)
- `PUT /api/vehicles/:id` - Update vehicle specs/status
- `DELETE /api/vehicles/:id` - Soft-delete / retire vehicle

### Bookings & Billing (`/api/bookings`)
- `POST /api/bookings/quote` - Preview pricing breakdown
- `POST /api/bookings` - Create reservation with overlap guard
- `GET /api/bookings/my-bookings` - Customer reservations
- `GET /api/bookings/all` - All reservations queue (Staff/Admin)
- `POST /api/bookings/:id/cancel` - Cancel reservation

### Payments (`/api/payments`)
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify signature and confirm booking

### Inspections & Check-In / Check-Out (`/api/inspections`)
- `POST /api/inspections` - Record pickup release or return check-in with automated fuel and late fee calculations
- `GET /api/inspections/booking/:id` - Inspection history

### Invoices (`/api/invoices`)
- `GET /api/invoices/:bookingId` - Stream high-resolution PDF tax invoice

### Executive & Fleet Admin (`/api/admin`)
- `GET /api/admin/dashboard` - KPIs, revenue trends, category pie data, top fleet
- `GET /api/admin/reports` - Export Excel (`.xlsx`) and PDF reports
- `GET /api/admin/users` - RBAC user registry
- `PUT /api/admin/users/:id/role` - Elevate or modify user role
- `GET /api/admin/audit-logs` - Searchable system audit trail

---

## 🛡️ Database Models (16 Tables)
1. `roles`
2. `users`
3. `branches`
4. `vehicles`
5. `vehicle_images`
6. `vehicle_documents`
7. `pricing_rules`
8. `promo_codes`
9. `bookings`
10. `payments`
11. `checkin_checkout`
12. `maintenance_records`
13. `reviews`
14. `notifications`
15. `support_tickets`
16. `audit_logs`
