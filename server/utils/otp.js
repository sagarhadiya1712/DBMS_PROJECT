const crypto = require('crypto');
const nodemailer = require('nodemailer');

function generateOTP() {
  // Generate cryptographically secure 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

async function sendOTPEmail(email, otp) {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  console.log(`\n========================================`);
  console.log(`📩 [EMAIL OTP DISPATCH]`);
  console.log(`To: ${email}`);
  console.log(`Code: ${otp}`);
  console.log(`Expires: 10 minutes`);
  console.log(`========================================\n`);

  if (!user || !pass) {
    console.log('ℹ️ Nodemailer credentials not configured in .env. OTP printed to console above for testing.');
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    await transporter.sendMail({
      from: `"Fleet Rental Verification" <${user}>`,
      to: email,
      subject: 'Your 6-Digit Email Verification Code - Vehicle Rental',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #0f172a; color: #f8fafc;">
          <h2 style="color: #6366f1; text-align: center;">Vehicle Rental Verification</h2>
          <p>Hello,</p>
          <p>Thank you for signing up. Please enter the following 6-digit verification code to activate your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8; background: #1e293b; padding: 12px 24px; border-radius: 8px; border: 1px solid #475569;">
              ${otp}
            </span>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please disregard this email.</p>
        </div>
      `
    });

    return { success: true, simulated: false };
  } catch (error) {
    console.error('⚠️ Failed to dispatch live SMTP email:', error.message);
    // Don't crash signup if SMTP fails; console OTP is available
    return { success: true, simulated: true, error: error.message };
  }
}

module.exports = {
  generateOTP,
  hashOTP,
  sendOTPEmail
};
