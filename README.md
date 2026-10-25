# 🚗 Vehicle Rental & Fleet Management System

A production-ready full-stack monorepo system automating the complete vehicle rental lifecycle: **Search → Zero Double-Booking Reservation → Razorpay Test Payment → Check-Out → Return Check-In with Late Fees → PDF Tax Invoicing**.

Built with a modern dark glassmorphic UI, role-based access control, automated fleet compliance alerts via `node-cron`, and executive analytics powered by Recharts and ExcelJS.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v7, Axios, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js (REST API MVC architecture)
- **Database**: SQLite using `better-sqlite3` (`/server/db/rental.db`, foreign keys enabled, indexes, WAL mode)
- **Authentication**: JWT, bcrypt, Google OAuth, 6-digit email OTP verification via Nodemailer
- **Payments**: Razorpay Sandbox/Test mode with HMAC-SHA256 signature verification & test fallback simulator
- **Digital Invoicing**: PDFKit streaming itemized tax invoices
- **Reporting**: ExcelJS multi-sheet workbooks (`.xlsx`) and PDF summary exports
- **Automated Cron**: `node-cron` scanning daily for overdue bookings and vehicle compliance/service deadlines (15-day alerts)

---

## 👥 Demo Login Credentials (1-Click Buttons on Login Page)

| Role | Email | Password | Access Clearance |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@rental.com` | `Admin@123` | Full control: Fleet CRUD, status, approvals, compliance alerts, exports |
| **🚗 Customer** | `customer@rental.com` | `Customer@123` | Reserve vehicles, Razorpay test payment, PDF invoice, reviews |

*Active Promo Codes: `WELCOME10` (10% off), `FLEET20` (20% off).*

---

## 🚀 Quickstart & Local Setup (In 5 Steps)

### Step 1: Clone & Navigate
```bash
git clone https://github.com/sagarhadiya1712/DBMS_PROJECT.git
cd DBMS_PROJECT
```

### Step 2: Install Dependencies
```bash
# In the server directory
cd server
npm install

# In the client directory
cd ../client
npm install
```

### Step 3: Initialize & Seed SQLite Database
Creates `/server/db/rental.db` with 11 tables and 14 realistic Indian fleet vehicles:
```bash
cd ../server
npm run db:init
npm run db:seed
```

### Step 4: Environment Configuration
Copy environment templates in both folders:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Step 5: Start the Development Servers
From the root directory or inside `server` & `client`:
```bash
# Terminal 1: Backend API (port 5000)
cd server
npm run dev

# Terminal 2: Frontend Client (port 3000)
cd client
npm run dev
```

- **Client Web App**: `http://localhost:3000`
- **Backend REST API**: `http://localhost:5000/api`

---

## 🔑 Checklist of Environment Variables (`.env`)

Configure these values in `/server/.env` for live production integrations (or leave defaults for local test mode):

| Variable | Purpose | How to Obtain / Configure |
| :--- | :--- | :--- |
| `JWT_SECRET` | Secret key for signing auth tokens | Any secure 32+ character random string |
| `GMAIL_USER` | Gmail address for OTP emails | Your Gmail account (e.g. `yourname@gmail.com`) |
| `GMAIL_APP_PASSWORD` | 16-character Google App Password | Google Account → Security → 2-Step Verification → App Passwords |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | Google Cloud Console → Credentials → OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Secret | Google Cloud Console → Credentials → Client Secret |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (Test Mode) | Razorpay Dashboard → Settings → API Keys → Generate Test Key |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | Razorpay Dashboard → Settings → API Keys |

*(Note: When Gmail or Razorpay credentials are left blank, the system automatically uses console OTP display and the built-in sandbox simulator, allowing full testing out-of-the-box).*

---

## 🗄️ Database Schema & SQLite Viewer

The database is powered by `better-sqlite3` located at `/server/db/rental.db`.
To view and inspect tables directly in VS Code:
1. Install the **SQLite Viewer** or **SQLite** extension in VS Code.
2. Open `/server/db/rental.db` in VS Code to browse tables:
   - `users`, `email_otps`, `vehicles`, `bookings`, `payments`, `maintenance`, `fuel_records`, `drivers`, `reviews`, `discounts`, `vehicle_documents`.

---

## 🧪 Automated Testing

Execute the complete end-to-end integration test suite verifying double-booking prevention, OTP verification, payment, invoice generation, and fleet exports:
```bash
cd server
npm test
```
All 15 test cases are documented in detail at [`TEST_CASES.md`](file:///d:/vehicle_rent/TEST_CASES.md).

---

## 🌐 Deployment Guide (Vercel & Render)

### 1. Frontend Deployment (Vercel)
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: Your deployed backend URL (e.g. `https://your-backend.onrender.com/api`)

### 2. Backend Deployment (Render)
- Root Directory: `server`
- Build Command: `npm install && npm run db:init && npm run db:seed`
- Start Command: `node server.js`
- Environment Variables: Fill the checklist above (`JWT_SECRET`, `PORT=5000`, etc.)

> [!IMPORTANT]
> **SQLite File Persistence Note on Render**:  
> Render's free tier uses an ephemeral filesystem where files created at runtime are reset on server restarts.  
> **Solutions**:
> 1. Attach a Render **Persistent Disk** mounted at `/server/db`.
> 2. Alternatively, connect to **Turso** (`@libsql/client`), which is a serverless hosted SQLite database with a generous free tier that keeps SQLite's speed with persistent cloud storage.
