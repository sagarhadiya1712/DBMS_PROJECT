const nodemailer = require('nodemailer');
const prisma = require('../config/db');

// Nodemailer transporter initialization (only initialized if SMTP credentials are provided)
let mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } catch (e) {
    console.warn('Mailer setup warning:', e.message);
  }
}

class NotificationService {
  /**
   * Dispatch an in-app notification
   */
  async sendInAppNotification({ userId, title, message, type = 'INFO', link = null, metadata = null }) {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          channel: 'IN_APP',
          link,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (e) {
      console.error('Failed to create in-app notification:', e.message);
      return null;
    }
  }

  /**
   * Send Email notification (with dev fallback logger)
   */
  async sendEmail({ to, subject, html, text }) {
    console.log(`[Email Notification] To: ${to} | Subject: ${subject}`);
    try {
      if (mailTransporter && process.env.SMTP_HOST && !process.env.SMTP_HOST.includes('ethereal')) {
        await mailTransporter.sendMail({
          from: process.env.EMAIL_FROM || '"Fleet Rentals" <notifications@fleetrentals.com>',
          to,
          subject,
          text: text || html,
          html,
        });
      }
      return true;
    } catch (e) {
      console.warn('Email dispatch warning (handled):', e.message);
      return false;
    }
  }

  /**
   * Send SMS via Twilio placeholder / mock service
   */
  async sendSMS({ to, message }) {
    console.log(`[Twilio SMS Placeholder] To: ${to} | Text: "${message}"`);
    return true;
  }

  /**
   * Multi-channel booking confirmation notification
   */
  async notifyBookingConfirmed(booking, customer, vehicle) {
    const title = 'Booking Confirmed!';
    const message = `Your reservation for ${vehicle.make} ${vehicle.model} (${booking.bookingReference}) is confirmed. Total: $${booking.totalPrice}.`;

    // 1. In-app
    await this.sendInAppNotification({
      userId: customer.id,
      title,
      message,
      type: 'BOOKING',
      link: `/bookings`,
      metadata: { bookingId: booking.id, bookingReference: booking.bookingReference },
    });

    // 2. Email
    await this.sendEmail({
      to: customer.email,
      subject: `Rental Confirmation: ${booking.bookingReference}`,
      html: `
        <h2>Thank you for booking with FleetRentals!</h2>
        <p>Dear ${customer.firstName},</p>
        <p>Your booking <strong>${booking.bookingReference}</strong> has been confirmed.</p>
        <p><strong>Vehicle:</strong> ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})</p>
        <p><strong>Pickup:</strong> ${new Date(booking.startDateTime).toLocaleString()}</p>
        <p><strong>Return:</strong> ${new Date(booking.endDateTime).toLocaleString()}</p>
        <p><strong>Total Amount:</strong> $${booking.totalPrice.toFixed(2)}</p>
        <p>Please present your valid driving license at pickup.</p>
      `,
    });

    // 3. SMS
    if (customer.phone) {
      await this.sendSMS({
        to: customer.phone,
        message: `FleetRentals: Your booking ${booking.bookingReference} for ${vehicle.make} ${vehicle.model} is confirmed! Check details in your app.`,
      });
    }
  }
}

module.exports = new NotificationService();
