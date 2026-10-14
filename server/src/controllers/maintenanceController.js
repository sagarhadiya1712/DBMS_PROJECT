const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const listMaintenance = async (req, res, next) => {
  try {
    const { status, vehicleId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;

    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true,
            status: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    return successResponse(res, records, 'Maintenance records retrieved');
  } catch (err) {
    next(err);
  }
};

const createMaintenance = async (req, res, next) => {
  try {
    const {
      vehicleId,
      serviceType,
      description,
      cost = 0,
      scheduledDate,
      technicianNotes,
    } = req.body;

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceRecord.create({
        data: {
          vehicleId,
          serviceType,
          description,
          cost: Number(cost),
          scheduledDate: new Date(scheduledDate || Date.now()),
          technicianNotes,
          status: 'SCHEDULED',
        },
      });

      // Update vehicle status to MAINTENANCE
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'MAINTENANCE' },
      });

      return created;
    });

    await logAudit({
      actorId: req.user.id,
      action: 'SCHEDULE_MAINTENANCE',
      entity: 'MAINTENANCE',
      entityId: record.id,
      details: { vehicleId, serviceType },
      req,
    });

    return successResponse(res, record, 'Maintenance scheduled successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateMaintenance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, completedDate, cost, technicianNotes } = req.body;

    const current = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!current) {
      return errorResponse(res, 'Maintenance record not found', 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(completedDate && { completedDate: new Date(completedDate) }),
          ...(cost !== undefined && { cost: Number(cost) }),
          ...(technicianNotes && { technicianNotes }),
        },
      });

      // If status changed to COMPLETED, check if vehicle has any other active maintenance
      if (status === 'COMPLETED') {
        const otherActive = await tx.maintenanceRecord.findFirst({
          where: {
            vehicleId: current.vehicleId,
            id: { not: id },
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        });

        if (!otherActive) {
          await tx.vehicle.update({
            where: { id: current.vehicleId },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      return record;
    });

    await logAudit({
      actorId: req.user.id,
      action: 'UPDATE_MAINTENANCE',
      entity: 'MAINTENANCE',
      entityId: id,
      details: { status },
      req,
    });

    return successResponse(res, updated, 'Maintenance record updated');
  } catch (err) {
    next(err);
  }
};

const getComplianceAlerts = async (req, res, next) => {
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 30); // 30 day window

    const expiringDocuments = await prisma.vehicleDocument.findMany({
      where: {
        expiryDate: { lte: threshold },
      },
      include: {
        vehicle: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    const pendingMaintenance = await prisma.maintenanceRecord.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
      include: { vehicle: true },
      orderBy: { scheduledDate: 'asc' },
    });

    return successResponse(res, {
      expiringDocuments,
      pendingMaintenance,
    }, 'Fleet compliance alerts retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listMaintenance,
  createMaintenance,
  updateMaintenance,
  getComplianceAlerts,
};
