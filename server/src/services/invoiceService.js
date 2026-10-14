const PDFDocument = require('pdfkit');
const prisma = require('../config/db');

// Helper to format date in DD/MM/YYYY
const formatDateIN = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTimeIN = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${day}/${month}/${year} ${time}`;
};

/**
 * Generate PDF digital invoice for a booking
 * @param {string} bookingId
 * @param {import('express').Response} res
 */
const generateInvoicePDF = async (bookingId, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      vehicle: true,
      pickupBranch: true,
      dropBranch: true,
      payments: true,
      inspections: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Load dynamic company and contact settings from database
  const settingsList = await prisma.systemSetting.findMany();
  const settings = {};
  for (const s of settingsList) {
    settings[s.key] = s.value;
  }
  const hqAddress = settings.headquarters_address || 'Swami Bhavan, SVNIT, Surat - 395007';
  const phone = settings.contact_phone_display || settings.contact_phone || '+91 70168 70683';
  const email = settings.contact_email || 'support@rentfleet.in';
  const brandName = settings.company_name ? `${settings.company_name.toUpperCase()} INDIA` : 'FLEETRENTALS INDIA';
  const tagline = settings.company_tagline || 'Vehicle Rental & Fleet Management System';

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Stream PDF directly to client response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="Invoice-${booking.bookingReference}.pdf"`
  );

  doc.pipe(res);

  // Brand Header
  doc.fillColor('#1E293B').fontSize(24).font('Helvetica-Bold').text(brandName, 40, 40);
  doc.fontSize(10).font('Helvetica').fillColor('#64748B').text(tagline.slice(0, 75), 40, 68);
  doc.text(`HQ: ${hqAddress} | Phone: ${phone} | ${email}`, 40, 82);

  // Invoice Title & Meta
  doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 380, 40, { align: 'right' });
  doc.fontSize(10).font('Helvetica').fillColor('#475569');
  doc.text(`Invoice No: INV-${booking.bookingReference}`, 380, 64, { align: 'right' });
  doc.text(`Date: ${formatDateIN(booking.createdAt)}`, 380, 78, { align: 'right' });
  doc.text(`Status: ${booking.status}`, 380, 92, { align: 'right' });

  doc.moveTo(40, 115).lineTo(555, 115).strokeColor('#E2E8F0').stroke();

  // Customer & Pickup Details
  const colY = 130;
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1E293B').text('Billed To:', 40, colY);
  doc.fontSize(10).font('Helvetica').fillColor('#334155');
  doc.text(`${booking.customer.firstName} ${booking.customer.lastName}`, 40, colY + 18);
  doc.text(`Email: ${booking.customer.email}`, 40, colY + 32);
  doc.text(`Phone: ${booking.customer.phone || 'N/A'}`, 40, colY + 46);
  if (booking.customer.drivingLicenseNumber) {
    doc.text(`License No: ${booking.customer.drivingLicenseNumber}`, 40, colY + 60);
  }

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1E293B').text('Rental Details:', 320, colY);
  doc.fontSize(10).font('Helvetica').fillColor('#334155');
  doc.text(`Vehicle: ${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`, 320, colY + 18);
  doc.text(`Reg Plate: ${booking.vehicle.licensePlate} (${booking.vehicle.category})`, 320, colY + 32);
  doc.text(`Pickup: ${formatDateTimeIN(booking.startDateTime)} @ ${booking.pickupBranch.name}`, 320, colY + 46);
  doc.text(`Return: ${formatDateTimeIN(booking.endDateTime)} @ ${booking.dropBranch.name}`, 320, colY + 60);

  doc.moveTo(40, 220).lineTo(555, 220).strokeColor('#E2E8F0').stroke();

  // Table Header
  const tableTop = 235;
  doc.rect(40, tableTop, 515, 24).fill('#F1F5F9');
  doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold');
  doc.text('Description', 50, tableTop + 7);
  doc.text('Duration / Rate', 280, tableTop + 7);
  doc.text('Amount (Rs.)', 480, tableTop + 7, { align: 'right' });

  // Line Items
  let currentY = tableTop + 32;
  doc.font('Helvetica').fillColor('#1E293B');

  // 1. Base rental
  doc.text(`Base Rental: ${booking.vehicle.make} ${booking.vehicle.model}`, 50, currentY);
  doc.text(`${booking.totalDays} Days @ Rs. ${booking.vehicle.dailyRate.toLocaleString('en-IN')}/day`, 280, currentY);
  doc.text(`Rs. ${booking.basePrice.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });

  // 2. Discount if applied
  if (booking.discountAmount > 0) {
    currentY += 22;
    doc.fillColor('#16A34A').text('Promotional Discount Applied', 50, currentY);
    doc.text('-', 280, currentY);
    doc.text(`-Rs. ${booking.discountAmount.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });
  }

  // 3. Additional fees from return inspection
  const returnInspection = booking.inspections?.find((i) => i.type === 'RETURN');
  if (returnInspection && returnInspection.totalAdditionalFee > 0) {
    if (returnInspection.lateFee > 0) {
      currentY += 22;
      doc.fillColor('#DC2626').text('Late Return Penalty Fee', 50, currentY);
      doc.text('-', 280, currentY);
      doc.text(`Rs. ${returnInspection.lateFee.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });
    }
    if (returnInspection.fuelCharge > 0) {
      currentY += 22;
      doc.fillColor('#DC2626').text(`Fuel Refill Discrepancy (${returnInspection.fuelLevel}%)`, 50, currentY);
      doc.text('-', 280, currentY);
      doc.text(`Rs. ${returnInspection.fuelCharge.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });
    }
    if (returnInspection.damageCharge > 0) {
      currentY += 22;
      doc.fillColor('#DC2626').text('Inspection Damage Recovery Fee', 50, currentY);
      doc.text('-', 280, currentY);
      doc.text(`Rs. ${returnInspection.damageCharge.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });
    }
  }

  // 4. Taxes
  currentY += 22;
  doc.fillColor('#1E293B').text('GST (10%)', 50, currentY);
  doc.text('-', 280, currentY);
  doc.text(`Rs. ${booking.taxAmount.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });

  // 5. Deposit
  currentY += 22;
  doc.text('Refundable Security Deposit', 50, currentY);
  doc.text('Standard', 280, currentY);
  doc.text(`Rs. ${booking.depositAmount.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });

  // Divider
  currentY += 28;
  doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#CBD5E1').stroke();

  // Total
  currentY += 12;
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A');
  doc.text('Total Invoiced Amount:', 280, currentY);
  doc.text(`Rs. ${booking.totalPrice.toLocaleString('en-IN')}`, 480, currentY, { align: 'right' });

  // Payment Breakdown
  currentY += 35;
  doc.fontSize(11).font('Helvetica-Bold').text('Payment Record:', 40, currentY);
  doc.fontSize(9).font('Helvetica').fillColor('#475569');
  if (booking.payments && booking.payments.length > 0) {
    const payment = booking.payments[0];
    currentY += 16;
    doc.text(`Method: ${payment.provider} (${payment.method || 'Card/UPI'})`, 40, currentY);
    doc.text(`Transaction ID: ${payment.transactionId}`, 200, currentY);
    doc.text(`Status: ${payment.status} (Paid: Rs. ${payment.amount.toLocaleString('en-IN')})`, 380, currentY);
  } else {
    currentY += 16;
    doc.text('Payment Pending / Unsettled', 40, currentY);
  }

  // Footer notes
  doc.fontSize(9).font('Helvetica').fillColor('#94A3B8').text(
    `Thank you for renting with ${settings.company_name || 'FleetRentals'} India. For claims or billing questions, contact ${phone} or ${email}.`,
    40,
    740,
    { align: 'center', width: 515 }
  );

  doc.end();
};

module.exports = {
  generateInvoicePDF,
};
