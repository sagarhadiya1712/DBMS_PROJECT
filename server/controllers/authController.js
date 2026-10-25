const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db/db');
const { signToken } = require('../utils/jwt');
const { generateOTP, hashOTP, compareOTP, sendOTPEmail, normalizeEmail, validateEmail } = require('../utils/otp');
const { syncUserToOracle, recordUserLogin } = require('../db/oracle');

/**
 * Safely parse SQLite datetime strings ('YYYY-MM-DD HH:MM:SS') or ISO strings into epoch ms
 */
function parseDbDate(dateStr) {
  if (!dateStr) return 0;
  if (typeof dateStr !== 'string') return new Date(dateStr).getTime();
  if (dateStr.includes('T')) return new Date(dateStr).getTime();
  return new Date(dateStr.replace(' ', 'T') + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
}

/**
 * Enforces max 5 OTPs per hour and strict 60-second cooldown per email
 */
function checkOtpRateLimit(normalizedEmail) {
  // 1. Max 5 OTPs per hour
  const hourRow = db.prepare(`
    SELECT COUNT(*) as count FROM email_otps 
    WHERE email = ? AND datetime(created_at) > datetime('now', '-1 hour')
  `).get(normalizedEmail);

  if (hourRow && hourRow.count >= 5) {
    return {
      allowed: false,
      status: 429,
      error: 'Maximum OTP request limit reached for this hour (5 OTPs per hour). Please try again after 1 hour.'
    };
  }

  // 2. Strict 60-second cooldown from the most recent OTP
  const latestOtp = db.prepare(`
    SELECT * FROM email_otps 
    WHERE email = ? 
    ORDER BY otp_id DESC LIMIT 1
  `).get(normalizedEmail);

  if (latestOtp && latestOtp.created_at) {
    const createdTime = parseDbDate(latestOtp.created_at);
    const elapsedSeconds = Math.floor((Date.now() - createdTime) / 1000);
    if (elapsedSeconds < 60 && elapsedSeconds >= 0) {
      const retryAfter = 60 - elapsedSeconds;
      return {
        allowed: false,
        status: 429,
        retryAfter,
        error: `Please wait ${retryAfter}s before requesting a new verification code.`
      };
    }
  }

  return { allowed: true };
}

// Validation Schemas
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['customer', 'owner']).default('customer').optional()
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

const verifyOtpSchema = z.object({
  email: z.string().email('Valid email is required'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits')
});

const completeProfileSchema = z.object({
  phone: z.string().min(10, 'Please enter a valid phone number with at least 10 digits')
});

/**
 * POST /api/auth/signup
 * Validates signup, enforces 60-second cooldown, prevents duplicate verified emails (409),
 * updates existing unverified users, and issues a 60-second bcrypt-hashed OTP.
 */
async function signup(req, res, next) {
  try {
    const data = signupSchema.parse(req.body);
    const validation = validateEmail(data.email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const email = validation.email;
    const phone = data.phone ? data.phone.trim() : null;

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser && existingUser.is_verified) {
      return res.status(409).json({
        error: 'An account with this email is already verified. Please sign in.'
      });
    }

    // Enforce 60-second cooldown & hourly rate limit
    if (process.env.NODE_ENV !== 'test') {
      const rateLimitCheck = checkOtpRateLimit(email);
      if (!rateLimitCheck.allowed) {
        return res.status(rateLimitCheck.status).json({
          error: rateLimitCheck.error,
          retry_after: rateLimitCheck.retryAfter,
          email
        });
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const rawOtp = generateOTP();
    const hashedOtp = await hashOTP(rawOtp);
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    // Dispatch OTP via Nodemailer (Gmail SMTP)
    const mailResult = await sendOTPEmail(email, rawOtp);
    if (!mailResult.success) {
      return res.status(400).json({
        error: mailResult.error || 'Failed to dispatch verification email. Please check your email address and try again.'
      });
    }

    let userId;
    if (existingUser) {
      // Existing unverified user -> update credentials
      db.prepare(`
        UPDATE users SET name = ?, phone = ?, password_hash = ?, role = COALESCE(?, role)
        WHERE user_id = ?
      `).run(data.name.trim(), phone, passwordHash, data.role || 'customer', existingUser.user_id);
      userId = existingUser.user_id;
    } else {
      // New user registration
      const userRole = data.role === 'owner' ? 'owner' : 'customer';
      const insertResult = db.prepare(`
        INSERT INTO users (name, phone, email, password_hash, role, is_verified, is_blocked, kyc_status)
        VALUES (?, ?, ?, ?, ?, 0, 0, 'NotSubmitted')
      `).run(data.name.trim(), phone, email, passwordHash, userRole);
      userId = insertResult.lastInsertRowid;
    }

    // Live sync user to Oracle Database
    try {
      const uRecord = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
      syncUserToOracle(uRecord).catch(() => {});
    } catch (e) {}

    // Invalidate previous unused OTPs for this email and persist new OTP record
    db.prepare('UPDATE email_otps SET used = 1 WHERE email = ? AND used = 0').run(email);
    db.prepare(`
      INSERT INTO email_otps (email, otp_hash, expires_at, used, attempts, created_at)
      VALUES (?, ?, ?, 0, 0, ?)
    `).run(email, hashedOtp, expiresAt, nowIso);

    res.status(201).json({
      message: 'Registration initiated! A 6-digit verification code has been dispatched to your email.',
      email,
      expires_in: 60,
      retry_after: 60,
      ...(process.env.NODE_ENV === 'test' ? { simulatedOtp: rawOtp } : {})
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/resend-otp
 * Allowed ONLY after 60s cooldown. Max 5 OTPs per email per hour.
 */
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const validation = validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const normalizedEmail = validation.email;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Account is already verified. You can log in directly.' });
    }

    // Rate limiting & 60-second cooldown check
    const rateLimitCheck = checkOtpRateLimit(normalizedEmail);
    if (!rateLimitCheck.allowed) {
      return res.status(rateLimitCheck.status).json({
        error: rateLimitCheck.error,
        retry_after: rateLimitCheck.retryAfter,
        email: normalizedEmail
      });
    }

    // Generate new OTP & hash with bcrypt
    const rawOtp = generateOTP();
    const hashedOtp = await hashOTP(rawOtp);
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const mailResult = await sendOTPEmail(normalizedEmail, rawOtp);
    if (!mailResult.success) {
      return res.status(400).json({
        error: mailResult.error || 'Failed to dispatch verification code. Please check that your email address is active.'
      });
    }

    // Invalidate previous unused OTPs and record fresh OTP
    db.prepare('UPDATE email_otps SET used = 1 WHERE email = ? AND used = 0').run(normalizedEmail);
    db.prepare(`
      INSERT INTO email_otps (email, otp_hash, expires_at, used, attempts, created_at)
      VALUES (?, ?, ?, 0, 0, ?)
    `).run(normalizedEmail, hashedOtp, expiresAt, nowIso);

    res.json({
      message: 'A fresh 6-digit verification code has been dispatched to your email.',
      email: normalizedEmail,
      expires_in: 60,
      retry_after: 60,
      ...(process.env.NODE_ENV === 'test' ? { simulatedOtp: rawOtp } : {})
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Verifies latest unused OTP. Rejects expired codes (400).
 * Blocks OTP after 5 incorrect attempts.
 * Updates is_verified = 1 and otp used = 1 in a single atomic transaction.
 */
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    // Query latest unused OTP
    const record = db.prepare(`
      SELECT * FROM email_otps
      WHERE email = ? AND used = 0
      ORDER BY otp_id DESC LIMIT 1
    `).get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        error: 'No active verification code found. Please request a new OTP.',
        expired: true
      });
    }

    // Check expiration (Strictly 60 seconds)
    const isExpired = new Date(record.expires_at).getTime() < Date.now();
    if (isExpired) {
      db.prepare('UPDATE email_otps SET used = 1 WHERE otp_id = ?').run(record.otp_id);
      return res.status(400).json({
        error: 'OTP expire ho gaya, naya code mangao',
        expired: true
      });
    }

    // Check attempt lockout (5 max attempts)
    if ((record.attempts || 0) >= 5) {
      db.prepare('UPDATE email_otps SET used = 1 WHERE otp_id = ?').run(record.otp_id);
      return res.status(400).json({
        error: 'Too many incorrect attempts. This OTP has been blocked for security. Please request a new code.',
        blocked: true
      });
    }

    // Verify bcrypt hash
    const isMatch = await compareOTP(otp.trim(), record.otp_hash);

    if (!isMatch) {
      const newAttempts = (record.attempts || 0) + 1;
      db.prepare('UPDATE email_otps SET attempts = ? WHERE otp_id = ?').run(newAttempts, record.otp_id);

      if (newAttempts >= 5) {
        db.prepare('UPDATE email_otps SET used = 1 WHERE otp_id = ?').run(record.otp_id);
        return res.status(400).json({
          error: 'Too many incorrect attempts. This OTP has been blocked. Please request a new code.',
          blocked: true
        });
      }

      return res.status(400).json({
        error: 'Invalid verification code. Please check and try again.',
        remaining_attempts: 5 - newAttempts
      });
    }

    // Sahi OTP -> Atomic transaction: mark OTP used AND user is_verified = 1
    const verifyTransaction = db.transaction(() => {
      db.prepare('UPDATE email_otps SET used = 1 WHERE otp_id = ?').run(record.otp_id);
      db.prepare('UPDATE users SET is_verified = 1 WHERE email = ?').run(normalizedEmail);

      return db.prepare(`
        SELECT user_id, name, phone, email, role, is_verified, is_blocked, google_id, created_at
        FROM users WHERE email = ?
      `).get(normalizedEmail);
    });

    const user = verifyTransaction();
    try { syncUserToOracle(user).catch(() => {}); } catch (e) {}
    const token = signToken({ user_id: user.user_id, role: user.role });

    res.json({
      message: 'Account successfully verified and activated!',
      token,
      user
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Rejects unverified users with 403 and automatically sends a fresh OTP.
 */
async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password combination.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password combination.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'This account has been suspended. Please contact fleet administration.' });
    }

    // If user is not verified -> enforce 60-second cooldown to prevent duplicate OTP emails
    if (!user.is_verified) {
      if (process.env.NODE_ENV !== 'test') {
        const rateCheck = checkOtpRateLimit(normalizedEmail);
        if (!rateCheck.allowed) {
          return res.status(403).json({
            error: `Your email is not verified yet. An OTP code was recently dispatched to your inbox. Please check your email or wait ${rateCheck.retryAfter}s to request a new code.`,
            unverified: true,
            email: normalizedEmail,
            retry_after: rateCheck.retryAfter
          });
        }
      }

      const rawOtp = generateOTP();
      const hashedOtp = await hashOTP(rawOtp);
      const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();

      const mailResult = await sendOTPEmail(normalizedEmail, rawOtp);
      if (mailResult.success) {
        db.prepare('UPDATE email_otps SET used = 1 WHERE email = ? AND used = 0').run(normalizedEmail);
        db.prepare(`
          INSERT INTO email_otps (email, otp_hash, expires_at, used, attempts, created_at)
          VALUES (?, ?, ?, 0, 0, ?)
        `).run(normalizedEmail, hashedOtp, expiresAt, nowIso);
      }

      return res.status(403).json({
        error: mailResult.success
          ? 'Your email has not been verified yet. We have sent a 6-digit OTP to your inbox.'
          : `Your email is unverified, but we could not deliver an email: ${mailResult.error}`,
        unverified: true,
        email: normalizedEmail,
        retry_after: 60
      });
    }

    // Update last_login in SQLite & live sync to Oracle
    try {
      db.prepare("UPDATE users SET last_login = datetime('now') WHERE user_id = ?").run(user.user_id);
      recordUserLogin(normalizedEmail).catch(() => {});
    } catch (e) {}

    const token = signToken({ user_id: user.user_id, role: user.role });

    const safeUser = {
      user_id: user.user_id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      is_blocked: user.is_blocked,
      kyc_status: user.kyc_status || 'NotSubmitted',
      kyc_rejection_reason: user.kyc_rejection_reason || null,
      created_at: user.created_at
    };

    res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/google
 * Handles Google OAuth. Creates user or updates google_id (is_verified = 1).
 * Detects missing phone number to prompt 'Complete Profile'.
 */
async function googleAuth(req, res, next) {
  try {
    const { credential, email, name, google_id } = req.body;

    let userEmail = email;
    let userName = name || 'Google User';
    let userGoogleId = google_id;

    // Verify Google ID token if provided
    if (credential) {
      const { OAuth2Client } = require('google-auth-library');
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (googleClientId && googleClientId.trim() !== '') {
        const client = new OAuth2Client(googleClientId);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: googleClientId
        });
        const payload = ticket.getPayload();
        userEmail = payload.email;
        userName = payload.name;
        userGoogleId = payload.sub;
      }
    }

    if (!userEmail) {
      return res.status(400).json({ 
        error: 'Please enter your Google account email to continue with Google sign-in.' 
      });
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      // New Google User -> automatically verified, no password
      const userRole = req.body.role === 'owner' ? 'owner' : 'customer';
      const insertResult = db.prepare(`
        INSERT INTO users (name, email, role, is_verified, is_blocked, google_id, kyc_status)
        VALUES (?, ?, ?, 1, 0, ?, 'NotSubmitted')
      `).run(userName, normalizedEmail, userRole, userGoogleId || 'google_' + Date.now());

      user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(insertResult.lastInsertRowid);
    } else {
      if (user.is_blocked) {
        return res.status(403).json({ error: 'This account has been suspended.' });
      }

      // Existing user -> link google_id and ensure verified
      db.prepare(`
        UPDATE users SET google_id = COALESCE(?, google_id), is_verified = 1
        WHERE user_id = ?
      `).run(userGoogleId || null, user.user_id);

      user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user.user_id);
    }

    try { syncUserToOracle(user).catch(() => {}); } catch (e) {}

    // Flag if phone number needs completion
    const needsPhone = !user.phone || user.phone.trim() === '';

    const token = signToken({ user_id: user.user_id, role: user.role });

    const safeUser = {
      user_id: user.user_id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      google_id: user.google_id,
      created_at: user.created_at
    };

    res.json({
      message: 'Google authentication successful',
      token,
      user: safeUser,
      needsPhone
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/complete-profile
 * Updates missing phone number (e.g. for Google OAuth users) directly in rental.db
 */
function completeProfile(req, res, next) {
  try {
    const { phone } = completeProfileSchema.parse(req.body);
    const userId = req.user.user_id;

    db.prepare('UPDATE users SET phone = ? WHERE user_id = ?').run(phone.trim(), userId);

    const updatedUser = db.prepare(`
      SELECT user_id, name, phone, email, role, is_verified, is_blocked, google_id, created_at
      FROM users WHERE user_id = ?
    `).get(userId);

    try { syncUserToOracle(updatedUser).catch(() => {}); } catch (e) {}

    res.json({
      message: 'Profile completed successfully!',
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
function getMe(req, res) {
  const user = db.prepare(`
    SELECT user_id, name, phone, email, role, is_verified, is_blocked, google_id, kyc_status, kyc_rejection_reason, created_at
    FROM users WHERE user_id = ?
  `).get(req.user.user_id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
}

module.exports = {
  signup,
  verifyOtp,
  resendOtp,
  login,
  googleAuth,
  completeProfile,
  getMe
};
