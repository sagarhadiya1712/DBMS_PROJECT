const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db/db');
const { signToken } = require('../utils/jwt');
const { generateOTP, hashOTP, sendOTPEmail } = require('../utils/otp');

// Validation Schemas
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

const verifyOtpSchema = z.object({
  email: z.string().email('Valid email is required'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

// POST /api/auth/signup
async function signup(req, res, next) {
  try {
    const data = signupSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const passwordHash = await bcrypt.hash(data.password, 10);

    let userId;
    if (existingUser) {
      if (existingUser.is_verified) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      }
      // Unverified user trying again -> update password and phone
      db.prepare(`
        UPDATE users SET name = ?, phone = ?, password_hash = ?
        WHERE user_id = ?
      `).run(data.name, data.phone || null, passwordHash, existingUser.user_id);
      userId = existingUser.user_id;
    } else {
      const result = db.prepare(`
        INSERT INTO users (name, phone, email, password_hash, role, is_verified, is_blocked)
        VALUES (?, ?, ?, ?, 'customer', 0, 0)
      `).run(data.name, data.phone || null, email, passwordHash);
      userId = result.lastInsertRowid;
    }

    // Generate 6-digit OTP
    const rawOtp = generateOTP();
    const otpHash = hashOTP(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Mark previous unused OTPs as used
    db.prepare('UPDATE email_otps SET used = 1 WHERE email = ? AND used = 0').run(email);

    // Save new OTP
    db.prepare(`
      INSERT INTO email_otps (email, otp_hash, expires_at, used)
      VALUES (?, ?, ?, 0)
    `).run(email, otpHash, expiresAt);

    // Dispatch OTP via Nodemailer (or log to terminal)
    await sendOTPEmail(email, rawOtp);

    res.status(201).json({
      message: 'Registration initiated. Please verify the 6-digit OTP sent to your email.',
      email,
      simulatedOtp: process.env.NODE_ENV === 'test' ? rawOtp : undefined
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/verify-otp
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const hashed = hashOTP(otp.trim());

    const record = db.prepare(`
      SELECT * FROM email_otps
      WHERE email = ? AND otp_hash = ? AND used = 0 AND expires_at > datetime('now')
      ORDER BY otp_id DESC LIMIT 1
    `).get(normalizedEmail, hashed);

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP code. Please request a new one.' });
    }

    // Mark OTP as used
    db.prepare('UPDATE email_otps SET used = 1 WHERE otp_id = ?').run(record.otp_id);

    // Mark user as verified
    db.prepare('UPDATE users SET is_verified = 1 WHERE email = ?').run(normalizedEmail);

    const user = db.prepare(`
      SELECT user_id, name, phone, email, role, is_verified, is_blocked, google_id, created_at
      FROM users WHERE email = ?
    `).get(normalizedEmail);

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

// POST /api/auth/resend-otp
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Account is already verified. You can log in directly.' });
    }

    const rawOtp = generateOTP();
    const otpHash = hashOTP(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare('UPDATE email_otps SET used = 1 WHERE email = ? AND used = 0').run(normalizedEmail);
    db.prepare(`
      INSERT INTO email_otps (email, otp_hash, expires_at, used)
      VALUES (?, ?, ?, 0)
    `).run(normalizedEmail, otpHash, expiresAt);

    await sendOTPEmail(normalizedEmail, rawOtp);

    res.json({
      message: 'A fresh 6-digit verification code has been dispatched to your email.',
      email: normalizedEmail,
      simulatedOtp: process.env.NODE_ENV === 'test' ? rawOtp : undefined
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
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

    if (!user.is_verified) {
      // Trigger new OTP for easy verification
      const rawOtp = generateOTP();
      const otpHash = hashOTP(rawOtp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      db.prepare('UPDATE email_otps SET used = 1 WHERE email = ? AND used = 0').run(normalizedEmail);
      db.prepare(`
        INSERT INTO email_otps (email, otp_hash, expires_at, used)
        VALUES (?, ?, ?, 0)
      `).run(normalizedEmail, otpHash, expiresAt);

      await sendOTPEmail(normalizedEmail, rawOtp);

      return res.status(403).json({
        error: 'Your email has not been verified yet. We have sent a 6-digit OTP to your inbox.',
        unverified: true,
        email: normalizedEmail
      });
    }

    const token = signToken({ user_id: user.user_id, role: user.role });

    const safeUser = {
      user_id: user.user_id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      is_blocked: user.is_blocked,
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

// Google OAuth Handler (Both direct token verification & simulated callback)
async function googleAuth(req, res, next) {
  try {
    const { credential, email, name, google_id } = req.body;

    let userEmail = email;
    let userName = name || 'Google User';
    let userGoogleId = google_id;

    // If client sent Google ID token
    if (credential) {
      const { OAuth2Client } = require('google-auth-library');
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (googleClientId && googleClientId !== 'placeholder_google_client_id') {
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
      return res.status(400).json({ error: 'Google email verification failed.' });
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      const resInsert = db.prepare(`
        INSERT INTO users (name, email, role, is_verified, is_blocked, google_id)
        VALUES (?, ?, 'customer', 1, 0, ?)
      `).run(userName, normalizedEmail, userGoogleId || 'google_' + Date.now());

      user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(resInsert.lastInsertRowid);
    } else {
      if (user.is_blocked) {
        return res.status(403).json({ error: 'This account has been suspended.' });
      }
      if (!user.is_verified) {
        db.prepare('UPDATE users SET is_verified = 1 WHERE user_id = ?').run(user.user_id);
        user.is_verified = 1;
      }
    }

    const token = signToken({ user_id: user.user_id, role: user.role });
    const safeUser = {
      user_id: user.user_id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      created_at: user.created_at
    };

    res.json({
      message: 'Google authentication successful',
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
function getMe(req, res) {
  res.json({ user: req.user });
}

module.exports = {
  signup,
  verifyOtp,
  resendOtp,
  login,
  googleAuth,
  getMe
};
