const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

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

/**
 * Send responsive HTML email with Nodemailer (Gmail SMTP)
 * Note: Plain OTP is sent strictly inside the encrypted email body and NEVER logged to DB or console.
 */
async function sendOTPEmail(email, otp) {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  console.log(`📨 [Nodemailer] Dispatching 60-second OTP email to: ${email}`);

  // If credentials are not configured in .env
  if (!user || !pass) {
    console.warn('⚠️ GMAIL_USER / GMAIL_APP_PASSWORD not set in .env. Email dispatch simulated.');
    return { success: true, simulated: true };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

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
            <span class="alert-pill">⏳ Yeh code 1 minute mein expire ho jayega (Expires in 60s)</span>
          </div>
        </div>

        <p style="text-align: center; font-size: 13px; color: #94a3b8;">
          If you did not request this verification code, please disregard this email or report it to security.
        </p>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Vehicle Rental & Fleet Management System. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Vehicle Rental System" <${user}>`,
    to: email,
    subject: 'Your 6-Digit Email Verification Code (Expires in 60s)',
    html: htmlTemplate
  });

  return { success: true, simulated: false };
}

module.exports = {
  generateOTP,
  hashOTP,
  compareOTP,
  sendOTPEmail
};
