const prisma = require('../config/db');

const logAudit = async ({ actorId, action, entity, entityId, details, req }) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'Unknown';

    await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = {
  logAudit,
};
