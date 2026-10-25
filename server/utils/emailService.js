const nodemailer = require('nodemailer');

function getTransporter() {
  const user = process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : '';
  const pass = process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') : '';

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000
  });
}

async function sendNotificationEmail({ to, subject, htmlContent }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`ℹ️ [Email Simulation] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    await transporter.sendMail({
      from: `"DriveGrid Fleet" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent
    });
    return { success: true };
  } catch (err) {
    console.warn(`⚠️ [Email Warning] Failed to send email to ${to}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function sendKYCApprovalEmail(email, name) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
      <h2 style="color: #10b981;">🎉 KYC Verification Approved!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Congratulations! Your identity documents have been verified and approved by the DriveGrid compliance team.</p>
      <p>You can now book vehicles or list vehicles on our platform seamlessly.</p>
      <p style="margin-top: 24px; color: #94a3b8; font-size: 13px;">DriveGrid Fleet & Rental Management</p>
    </div>
  `;
  return await sendNotificationEmail({ to: email, subject: 'Your DriveGrid KYC Verification is Approved!', htmlContent });
}

async function sendKYCRejectionEmail(email, name, reason) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
      <h2 style="color: #ef4444;">⚠️ KYC Verification Update Required</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We reviewed your submitted documents, but your verification could not be approved due to the following reason:</p>
      <blockquote style="background: #1e293b; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; color: #fca5a5;">
        ${reason || 'Document photo is unclear or information does not match.'}
      </blockquote>
      <p>Please log in to your account and re-upload clear photos of your valid documents.</p>
      <p style="margin-top: 24px; color: #94a3b8; font-size: 13px;">DriveGrid Fleet & Rental Management</p>
    </div>
  `;
  return await sendNotificationEmail({ to: email, subject: 'DriveGrid KYC Verification Update Required', htmlContent });
}

async function sendVehicleApprovalEmail(email, name, vehicleName) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
      <h2 style="color: #10b981;">🚗 Vehicle Listing Approved!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your vehicle <strong>${vehicleName}</strong> has been inspected and approved by our team!</p>
      <p>It is now live on the DriveGrid platform and available for customer bookings.</p>
      <p style="margin-top: 24px; color: #94a3b8; font-size: 13px;">DriveGrid Fleet & Rental Management</p>
    </div>
  `;
  return await sendNotificationEmail({ to: email, subject: `Vehicle Approved: ${vehicleName}`, htmlContent });
}

async function sendVehicleRejectionEmail(email, name, vehicleName, reason) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
      <h2 style="color: #ef4444;">⚠️ Vehicle Listing Status Update</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your vehicle listing for <strong>${vehicleName}</strong> could not be approved at this time:</p>
      <blockquote style="background: #1e293b; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; color: #fca5a5;">
        ${reason || 'Missing required clear photos or valid documents.'}
      </blockquote>
      <p>Please update your vehicle details and documents from your Owner Dashboard.</p>
    </div>
  `;
  return await sendNotificationEmail({ to: email, subject: `Vehicle Listing Update: ${vehicleName}`, htmlContent });
}

async function sendPayoutPaidEmail(email, name, amount, referenceNo) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
      <h2 style="color: #10b981;">💰 Owner Payout Processed!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>A payout of <strong>₹${Number(amount).toLocaleString('en-IN')}</strong> has been transferred to your registered bank / UPI account.</p>
      <p><strong>Bank Reference / UTR Number:</strong> ${referenceNo || 'N/A'}</p>
      <p>Thank you for partnering with DriveGrid!</p>
    </div>
  `;
  return await sendNotificationEmail({ to: email, subject: `Owner Payout Credited - ₹${amount}`, htmlContent });
}

module.exports = {
  sendKYCApprovalEmail,
  sendKYCRejectionEmail,
  sendVehicleApprovalEmail,
  sendVehicleRejectionEmail,
  sendPayoutPaidEmail
};
