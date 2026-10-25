const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const dns = require('dns').promises;

/**
 * Standard RFC 5322 regex for email syntax validation
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * RFC-reserved and fictitious domains that cannot receive live internet emails
 */
const BLOCKED_DUMMY_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'rental.com',
  'localhost',
  'invalid'
]);

/**
 * Normalize an email address:
 * - Trims whitespace
 * - Converts to lowercase
 * - Strips zero-width and control characters
 */
function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/**
 * Synchronous syntax & format validation
 */
function validateEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { valid: false, error: 'Email address is required.' };
  }

  if (normalized.length > 254) {
    return { valid: false, error: 'Email address exceeds maximum length (254 characters).' };
  }

  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, error: 'Please enter a valid email address format (e.g., name@domain.com).' };
  }

  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid email address structure.' };
  }

  const domain = parts[1];
  if (!domain || !domain.includes('.')) {
    return { valid: false, error: 'Email domain must have a valid top-level domain.' };
  }

  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, error: 'Invalid top-level domain in email address.' };
  }

  if (process.env.NODE_ENV !== 'test' && BLOCKED_DUMMY_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: `Email domain "${domain}" is a test/placeholder domain and cannot receive live email. Please use a valid, active email address.`
    };
  }

  return { valid: true, email: normalized, domain };
}

/**
 * Check if the email domain has valid DNS Mail Exchange (MX) records
 */
async function isDeliverableEmail(email) {
  const validation = validateEmail(email);
  if (!validation.valid) {
    return { deliverable: false, error: validation.error };
  }

  if (process.env.NODE_ENV === 'test') {
    return { deliverable: true, email: validation.email };
  }

  const domain = validation.domain;

  try {
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS query timeout')), 2500))
    ]);

    if (!mxRecords || mxRecords.length === 0) {
      return {
        deliverable: false,
        error: `The email domain "${domain}" has no mail servers configured to receive emails.`
      };
    }

    // Check for null MX record (RFC 7505: priority 0, exchange "" denotes domain does not accept email)
    const hasValidExchange = mxRecords.some((record) => record.exchange && record.exchange.trim().length > 0);
    if (!hasValidExchange) {
      return {
        deliverable: false,
        error: `The email domain "${domain}" explicitly rejects incoming mail.`
      };
    }

    return { deliverable: true, email: validation.email };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'SERVFAIL') {
      return {
        deliverable: false,
        error: `The email domain "${domain}" does not exist or does not accept incoming emails.`
      };
    }

    // In case of timeout or local network DNS resolution failure, log warning and allow syntax-valid emails through
    console.warn(`⚠️ [DNS Warning] MX lookup skipped for ${domain} (${err.message})`);
    return { deliverable: true, email: validation.email };
  }
}

/**
 * Generate cryptographically secure 6-digit numeric OTP using crypto.randomInt
 */
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash plain OTP using bcrypt before database persistence
 */
async function hashOTP(otp) {
  return await bcrypt.hash(String(otp), 10);
}

/**
 * Compare plain OTP with bcrypt hash
 */
async function compareOTP(plainOtp, hashedOtp) {
  if (!plainOtp || !hashedOtp) return false;
  return await bcrypt.compare(String(plainOtp), String(hashedOtp));
}

// Transporter cache singleton
let cachedTransporter = null;

function getTransporter(user, pass) {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      pool: true,
      maxConnections: 3,
      auth: {
        user: user,
        pass: pass
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    });
  }
  return cachedTransporter;
}

/**
 * Send responsive HTML email with Nodemailer (Gmail SMTP)
 *
 * Rules:
 * 1. GMAIL_USER is used ONLY as the sender email.
 * 2. Recipient is the exact normalized email submitted in login/signup.
 * 3. Never log OTPs, passwords, or credentials.
 * 4. Report SMTP delivery result or error safely.
 */
async function sendOTPEmail(recipientEmail, otp) {
  // 1. Validate & normalize recipient
  const validation = validateEmail(recipientEmail);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }
  const normalizedRecipient = validation.email;

  // 2. Configure sender strictly from GMAIL_USER
  const senderEmail = process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : '';
  const appPassword = process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') : '';

  // In test environment, do not dispatch live emails to test accounts to avoid inbox bounce loops
  if (process.env.NODE_ENV === 'test') {
    return {
      success: true,
      simulated: true,
      messageId: `test-env-${Date.now()}`
    };
  }

  // If credentials are not configured in .env
  if (!senderEmail || !appPassword) {
    console.warn(`⚠️ [Nodemailer] GMAIL_USER / GMAIL_APP_PASSWORD not set in server/.env. Email dispatch simulated for: ${normalizedRecipient}`);
    return {
      success: false,
      error: 'Email service is not configured on the server. Please contact system administration.'
    };
  }

  // 3. Check domain deliverability
  const deliverability = await isDeliverableEmail(normalizedRecipient);
  if (!deliverability.deliverable) {
    return {
      success: false,
      error: deliverability.error
    };
  }

  const transporter = getTransporter(senderEmail, appPassword);

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #f1f5f9; }
        .container { max-width: 520px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo-badge { display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #4f46e5, #06b6d4); color: white; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px; }
        h1 { font-size: 22px; color: #ffffff; margin: 0 0 8px 0; font-weight: 700; }
        p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0; }
        .otp-box { text-align: center; margin: 28px 0; padding: 20px; background: #020617; border: 2px dashed #38bdf8; border-radius: 12px; }
        .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; display: inline-block; }
        .alert-pill { display: inline-flex; align-items: center; justify-content: center; background: #450a0a; color: #f87171; border: 1px solid #991b1b; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 12px; }
        .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-badge">🚗 Vehicle Rental & Fleet Management</div>
          <h1>Verify Your Email Address</h1>
          <p>Thank you for registering with our Fleet Management System. Use the 6-digit confirmation code below to activate your account:</p>
        </div>

        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div>
            <span class="alert-pill">⏳ Valid for 60 seconds (Expires in 60s)</span>
          </div>
        </div>

        <p style="text-align: center; font-size: 13px; color: #94a3b8;">
          If you did not request this verification code, please ignore this email or contact support. Never share your OTP with anyone.
        </p>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Vehicle Rental & Fleet Management System. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Vehicle Rental System" <${senderEmail}>`,
      to: normalizedRecipient,
      subject: 'Your 6-Digit Email Verification Code (Expires in 60s)',
      text: `Your Vehicle Rental verification code is: ${otp}. It expires in 60 seconds. Do not share this code with anyone.`,
      html: htmlTemplate
    });

    if (info.rejected && info.rejected.length > 0) {
      console.warn(`⚠️ [Nodemailer] Recipient rejected by SMTP server: ${info.rejected.join(', ')}`);
      return {
        success: false,
        error: `The mail server rejected recipient address: ${info.rejected.join(', ')}`
      };
    }

    console.log(`✅ [Nodemailer] Email successfully sent to ${normalizedRecipient} (Message ID: ${info.messageId})`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`❌ [Nodemailer] Failed to send email to ${normalizedRecipient}:`, err.message);
    return {
      success: false,
      simulated: false,
      error: `Failed to deliver verification email: ${err.message}`
    };
  }
}

module.exports = {
  generateOTP,
  hashOTP,
  compareOTP,
  sendOTPEmail,
  normalizeEmail,
  validateEmail,
  isDeliverableEmail
};
