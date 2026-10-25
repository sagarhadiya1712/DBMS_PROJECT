const PDFDocument = require('pdfkit');

function generateInvoicePDF(bookingData, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Stream directly to HTTP response
  doc.pipe(res);

  // Header / Branding
  doc.rect(0, 0, doc.page.width, 100).fill('#0f172a');

  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
    .text('VEHICLE RENTAL & FLEET', 40, 32);
  doc.fontSize(10).font('Helvetica')
    .text('Official Tax Invoice & Rental Receipt', 40, 60);

  doc.fillColor('#38bdf8').fontSize(14).font('Helvetica-Bold')
    .text(`INVOICE #${bookingData.booking_id.toString().padStart(6, '0')}`, 400, 35, { align: 'right' });
  doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
    .text(`Date: ${new Date(bookingData.created_at || Date.now()).toLocaleDateString('en-IN')}`, 400, 55, { align: 'right' });

  // Reset to dark text
  doc.fillColor('#1e293b');

  // Billing Details Section
  let y = 120;
  doc.fontSize(12).font('Helvetica-Bold').text('Customer Details', 40, y);
  doc.fontSize(12).font('Helvetica-Bold').text('Rental Provider', 320, y);

  y += 20;
  doc.fontSize(10).font('Helvetica')
    .text(`Name: ${bookingData.customer_name || 'Valued Customer'}`, 40, y)
    .text(`Email: ${bookingData.customer_email || 'N/A'}`, 40, y + 15)
    .text(`Phone: ${bookingData.customer_phone || 'N/A'}`, 40, y + 30);

  doc.text('AutoFleet Mobility Services Pvt Ltd', 320, y)
    .text('GSTIN: 27AABCV9999Z1Z5', 320, y + 15)
    .text('Support: support@rentfleet.com', 320, y + 30);

  // Vehicle & Booking Information
  y += 60;
  doc.rect(40, y, doc.page.width - 80, 24).fill('#f1f5f9');
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
    .text('VEHICLE & SCHEDULE SUMMARY', 50, y + 7);

  y += 32;
  doc.fillColor('#334155').fontSize(10).font('Helvetica')
    .text(`Vehicle: ${bookingData.vehicle_brand} ${bookingData.vehicle_name} (${bookingData.vehicle_category})`, 50, y)
    .text(`Fuel / Transmission: ${bookingData.fuel_type || 'Petrol'} / ${bookingData.transmission || 'Manual'}`, 50, y + 16)
    .text(`Chauffeur Service: ${bookingData.is_chauffeur_driven ? 'Included (Chauffeur-driven)' : 'Self-drive'}`, 50, y + 32);

  const startFormatted = new Date(bookingData.start_datetime).toLocaleString('en-IN');
  const endFormatted = new Date(bookingData.end_datetime).toLocaleString('en-IN');
  doc.text(`Pick-up: ${startFormatted}`, 320, y)
    .text(`Return:  ${endFormatted}`, 320, y + 16)
    .text(`Pricing Plan: Per ${bookingData.pricing_type}`, 320, y + 32);

  // Itemized Pricing Table
  y += 65;
  doc.rect(40, y, doc.page.width - 80, 24).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
    .text('Description', 50, y + 7)
    .text('Amount (INR)', 420, y + 7, { align: 'right' });

  y += 28;
  const drawRow = (desc, amount, isDeduction = false, isBold = false) => {
    doc.fillColor(isDeduction ? '#16a34a' : '#1e293b')
      .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(10)
      .text(desc, 50, y)
      .text(`${isDeduction ? '-' : ''}Rs. ${Math.abs(amount).toFixed(2)}`, 420, y, { align: 'right' });
    y += 20;
  };

  const baseRental = (bookingData.total_amount - (bookingData.late_fee || 0) + (bookingData.discount_amount || 0));
  drawRow(`Base Rental Fee (${bookingData.pricing_type} rate)`, baseRental);

  if (bookingData.deposit_amount && bookingData.deposit_amount > 0) {
    drawRow('Refundable Security Deposit', bookingData.deposit_amount);
  }

  if (bookingData.discount_amount && bookingData.discount_amount > 0) {
    drawRow('Promotional Voucher Discount', bookingData.discount_amount, true);
  }

  if (bookingData.late_fee && bookingData.late_fee > 0) {
    drawRow('Late Return / Extra KM Penalty Fee', bookingData.late_fee);
  }

  // Divider
  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#cbd5e1').stroke();
  y += 8;

  // Grand Total
  doc.rect(40, y, doc.page.width - 80, 28).fill('#f8fafc');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12)
    .text('GRAND TOTAL PAID', 50, y + 8)
    .text(`Rs. ${(bookingData.total_amount + (bookingData.deposit_amount || 0)).toFixed(2)}`, 420, y + 8, { align: 'right' });

  y += 45;

  // Payment Metadata
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Payment Record:', 50, y);
  y += 16;
  doc.fontSize(9).font('Helvetica').fillColor('#475569')
    .text(`Payment Gateway: Razorpay (Test Mode)`, 50, y)
    .text(`Status: ${bookingData.payment_status || 'Paid'}`, 50, y + 14)
    .text(`Razorpay Payment ID: ${bookingData.razorpay_payment_id || 'pay_test_' + bookingData.booking_id}`, 50, y + 28)
    .text(`Booking Status: ${bookingData.status}`, 50, y + 42);

  // Footer notes
  const footerY = doc.page.height - 70;
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
    .text('Thank you for choosing our Vehicle Rental Fleet. This is an electronically generated invoice.', 40, footerY, { align: 'center', width: doc.page.width - 80 })
    .text('For roadside emergency assistance or rental queries, please dial +91 98765 43210.', 40, footerY + 14, { align: 'center', width: doc.page.width - 80 });

  doc.end();
}

module.exports = {
  generateInvoicePDF
};
