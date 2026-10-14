const cron = require('node-cron');
const prisma = require('../config/db');
const notificationService = require('../services/notificationService');

/**
 * Check for documents (insurance, registration) expiring in the next 14 days
 * and upcoming maintenance schedules
 */
const checkComplianceAndMaintenanceAlerts = async () => {
  console.log('⏰ [Cron] Running automated fleet compliance & maintenance scan...');
  try {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + 14); // 14-day alert window

    // 1. Find expiring documents
    const expiringDocs = await prisma.vehicleDocument.findMany({
      where: {
        expiryDate: {
          gte: now,
          lte: thresholdDate,
        },
        status: { in: ['ACTIVE', 'PENDING_RENEWAL'] },
      },
      include: {
        vehicle: true,
      },
    });

    // 2. Find managers and admins
    const staffRecipients = await prisma.user.findMany({
      where: {
        role: {
          name: { in: ['ADMIN', 'MANAGER'] },
        },
      },
    });

    for (const doc of expiringDocs) {
      const daysLeft = Math.ceil((doc.expiryDate - now) / (1000 * 60 * 60 * 24));
      const title = `⚠️ ${doc.documentType} Expiring Soon: ${doc.vehicle.make} ${doc.vehicle.model}`;
      const message = `${doc.documentType} (${doc.documentNumber || doc.vehicle.licensePlate}) expires in ${daysLeft} days on ${doc.expiryDate.toLocaleDateString()}. Urgent renewal action required.`;

      for (const recipient of staffRecipients) {
        // Prevent duplicate spam if notification already exists
        const exists = await prisma.notification.findFirst({
          where: {
            userId: recipient.id,
            title,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!exists) {
          await notificationService.sendInAppNotification({
            userId: recipient.id,
            title,
            message,
            type: 'ALERT',
            link: '/fleet',
          });
        }
      }
    }

    // 3. Find scheduled maintenance due within 48 hours
    const maintenanceThreshold = new Date();
    maintenanceThreshold.setDate(maintenanceThreshold.getDate() + 2);

    const dueMaintenance = await prisma.maintenanceRecord.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledDate: {
          gte: now,
          lte: maintenanceThreshold,
        },
      },
      include: {
        vehicle: true,
      },
    });

    for (const record of dueMaintenance) {
      const title = `🔧 Service Due: ${record.vehicle.make} ${record.vehicle.model}`;
      const message = `${record.serviceType} is scheduled on ${record.scheduledDate.toLocaleDateString()} for vehicle ${record.vehicle.licensePlate}.`;

      for (const recipient of staffRecipients) {
        const exists = await prisma.notification.findFirst({
          where: {
            userId: recipient.id,
            title,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!exists) {
          await notificationService.sendInAppNotification({
            userId: recipient.id,
            title,
            message,
            type: 'MAINTENANCE',
            link: '/maintenance',
          });
        }
      }
    }

    console.log(`✅ [Cron] Scan complete. Found ${expiringDocs.length} expiring docs and ${dueMaintenance.length} maintenance schedules.`);
  } catch (err) {
    console.error('❌ [Cron] Error running alert scan:', err);
  }
};

const initCronJobs = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    checkComplianceAndMaintenanceAlerts();
  });

  // Run on server startup in dev mode
  setTimeout(() => {
    checkComplianceAndMaintenanceAlerts();
  }, 3000);
};

module.exports = {
  initCronJobs,
  checkComplianceAndMaintenanceAlerts,
};
