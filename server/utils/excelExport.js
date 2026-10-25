const ExcelJS = require('exceljs');

async function generateFleetReportExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Vehicle Rental & Fleet Management System';
  workbook.created = new Date();

  // 1. Sheet: Revenue
  const revSheet = workbook.addWorksheet('Revenue Report');
  revSheet.columns = [
    { header: 'Period / Date', key: 'period', width: 20 },
    { header: 'Completed Bookings', key: 'bookings', width: 22 },
    { header: 'Gross Revenue (INR)', key: 'revenue', width: 25 },
  ];
  revSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  revSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };

  (data.revenue || []).forEach(row => {
    revSheet.addRow({
      period: row.period,
      bookings: row.count || row.bookings || 0,
      revenue: row.total || row.revenue || 0
    });
  });

  // 2. Sheet: Most Booked Vehicles
  const popularSheet = workbook.addWorksheet('Most Booked Vehicles');
  popularSheet.columns = [
    { header: 'Vehicle ID', key: 'vehicle_id', width: 14 },
    { header: 'Vehicle Name', key: 'name', width: 26 },
    { header: 'Brand', key: 'brand', width: 18 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Total Bookings', key: 'booking_count', width: 18 },
    { header: 'Total Revenue (INR)', key: 'total_revenue', width: 22 }
  ];
  popularSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  popularSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4338CA' }
  };

  (data.mostBooked || []).forEach(row => {
    popularSheet.addRow({
      vehicle_id: row.vehicle_id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      booking_count: row.booking_count,
      total_revenue: row.total_revenue || 0
    });
  });

  // 3. Sheet: Idle Vehicles
  const idleSheet = workbook.addWorksheet('Idle Fleet');
  idleSheet.columns = [
    { header: 'Vehicle ID', key: 'vehicle_id', width: 14 },
    { header: 'Name', key: 'name', width: 26 },
    { header: 'Brand', key: 'brand', width: 18 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Daily Rate (INR)', key: 'price_per_day', width: 18 }
  ];
  idleSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  idleSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF9333EA' }
  };

  (data.idleVehicles || []).forEach(row => {
    idleSheet.addRow({
      vehicle_id: row.vehicle_id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      status: row.status,
      price_per_day: row.price_per_day
    });
  });

  // 4. Sheet: Customer Summary
  const custSheet = workbook.addWorksheet('Customer Metrics');
  custSheet.columns = [
    { header: 'User ID', key: 'user_id', width: 12 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Total Bookings', key: 'total_bookings', width: 16 },
    { header: 'Total Spend (INR)', key: 'total_spent', width: 20 },
    { header: 'Status', key: 'status', width: 14 }
  ];
  custSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  custSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F766E' }
  };

  (data.customers || []).forEach(row => {
    custSheet.addRow({
      user_id: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      total_bookings: row.total_bookings || 0,
      total_spent: row.total_spent || 0,
      status: row.is_blocked ? 'Blocked' : 'Active'
    });
  });

  return workbook;
}

module.exports = {
  generateFleetReportExcel
};
