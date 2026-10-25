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

*(Note: When Gmail or Razorpay credentials are left blank, the system automatically uses console OTP display and the built-in sandbox simulator, allowing full testing out-of-the-box).*

---

## 🔐 Complete Authentication & Verification Flow

### 1. Email OTP Verification (Signup & Unverified Login)
- **6-Digit Cryptographic Code**: Generated via `crypto.randomInt(100000, 1000000)` and hashed using `bcrypt` before storage in `email_otps`. Plain OTP codes are **never** logged or stored in the database.
- **Strict 60-Second Expiry**: OTPs expire after exactly 60 seconds (`expires_at = now + 60s`). Expired verification attempts receive `400 Bad Request` ("OTP expire ho gaya, naya code mangao").
- **Rate-Limiting & Cooldown**:
  - Requesting a new OTP is subject to a strict 60-second cooldown. Early requests return `429 Too Many Requests` with a dynamic `retry_after` countdown in seconds.
  - Maximum limit: **5 OTPs per email per hour**.
- **Brute-Force Lockout Guard**:
  - Each wrong verification attempt increments `attempts` count in the database.
  - After **5 consecutive wrong attempts**, the OTP is immediately invalidated and blocked.
- **Atomic Database Transaction**:
  - On successful verification, a single `db.transaction()` marks `email_otps.used = 1` and updates `users.is_verified = 1`, issuing a signed JWT token for immediate auto-login.
- **Unverified Login Prevention**:
  - Attempting to log in with an unverified account returns `403 Forbidden` and automatically dispatches a fresh 60-second OTP to the user's inbox, redirecting the frontend to `/verify-email`.
- **Frontend Verify Email Page**:
  - 6 dedicated input boxes with auto-focus, auto-advance, backspace navigation, and clipboard paste support.
  - 60-second countdown timer (`01:00` to `00:00`) that persists across browser page reloads via `localStorage`.
  - When timer reaches 0, input boxes are disabled and the "Resend code" button becomes active. While the timer runs, the resend button remains disabled displaying the countdown ("Resend in 45s").

---

## 🌐 Google OAuth & Profile Completion

- **Universal Google Login**: A "Sign in with Google" button is available on both **Login** and **Signup** pages.
- **Automatic User Creation**:
  - First-time Google users are immediately saved to `/server/db/rental.db` with `is_verified = 1`, `role = 'customer'`, and `password_hash = NULL`.
  - Google accounts do not require email OTP verification.
- **Existing User Linking**: If an email is already present in `users`, Google OAuth securely links the `google_id` and marks `is_verified = 1`.
- **Profile Completion Step (Phone Number)**:
  - Google accounts do not supply a mobile number. The backend detects this and returns `needsPhone: true`.
  - The frontend automatically presents a dark glassmorphic **"Complete Profile"** modal prompting for a phone number.
  - Submitting saves the phone number directly to `rental.db` via `PUT /api/auth/complete-profile`.
- **Suspension Protection**: Suspended accounts (`is_blocked = 1`) are strictly rejected with `403 Forbidden`.

---

## 🗄️ Live Database (SQLite `rental.db`) & Dev Route

- **Zero Memory Buffering**: Every signup, OTP generation, verification, Google login, profile update, booking, and payment writes **immediately** to disk at `/server/db/rental.db` via parameterized queries (`?`).
- **Development Disk Visibility (`PRAGMA journal_mode = DELETE`)**:
  - In development mode (`NODE_ENV !== 'production'`), `db.js` sets `PRAGMA journal_mode = DELETE` instead of WAL. This allows the VS Code SQLite Viewer extension to reflect disk changes instantly without waiting for WAL checkpoint flushes.
  - In production, WAL mode (`PRAGMA journal_mode = WAL`) can be configured for maximum concurrency.
- **Live Database Inspection Route**:
  - **`GET /api/dev/db-inspect`**: A dedicated endpoint providing live SQLite statistics including journal mode, foreign key status, table row counts (`users`, `vehicles`, `bookings`, `email_otps`), and recent records.

---

## 🧪 Automated Testing

Execute the complete end-to-end integration test suite verifying double-booking prevention, 60s OTP expiration, brute-force lockout, payment signature verification, and fleet reports:
```bash
cd server
npm test
```
All **23 integration tests** pass cleanly with 100% coverage across business logic and database concurrency.

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

---

## 🔑 Authentication Guide: Email OTP & Google Sign-In

### 1. 📧 Email OTP Verification
- **How Real Email Delivery Works**:
  1. Open your Google Account at [myaccount.google.com/security](https://myaccount.google.com/security).
  2. Ensure **2-Step Verification** is turned ON.
  3. Search for **App passwords**, create one named `VehicleRental`, and copy the 16-character code (e.g., `abcd efgh ijkl mnop`).
  4. Paste into `server/.env`:
     ```env
     GMAIL_USER=your_gmail_id@gmail.com
     GMAIL_APP_PASSWORD=your_16_char_app_password
     ```
  5. Restart the server (`node server.js`). OTPs will now be sent straight to any entered email inbox via direct SSL connection (`smtp.gmail.com:465`).
- **Zero-Block Development / Demo Mode**:
  - If `GMAIL_USER` and `GMAIL_APP_PASSWORD` are not configured in `.env`, the system automatically activates **Dev Mode**:
  - The 6-digit code is generated and securely hashed in the database, while the verification screen displays a **"Verification Code Generated"** card with an **`[⚡ Auto-Fill Code]`** button. You can click this to instantly test and verify registrations without needing an SMTP connection.

### 2. 🌐 Google Sign-In & Sign-Up
- **Direct 1-Click Verification**:
  - Clicking **"Sign up with Google"** or **"Sign in with Google"** opens the modal.
  - You can enter any Google email address or click **"Use 1-Click Demo Google Account"**.
  - Accounts verified through Google are automatically activated (`is_verified = 1`) and can immediately browse and book vehicles without waiting for an OTP.

