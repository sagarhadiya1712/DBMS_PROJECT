const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../utils/audit');
const notificationService = require('../services/notificationService');

/**
 * Handle Staff Check-out (Pickup) & Check-in (Return)
 */
const createInspection = async (req, res, next) => {
  try {
    const {
      bookingId,
      type, // 'PICKUP' or 'RETURN'
      odometerReading,
      fuelLevel,
      checklist,
      photos,
      damageNotes,
      damageCharge = 0,
    } = req.body;

    const staffId = req.user.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: true,
        customer: true,
        inspections: true,
      },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    let lateFee = 0;
    let fuelCharge = 0;
    const finalDamageCharge = Number(damageCharge) || 0;
    let totalAdditionalFee = 0;

    const now = new Date();

    if (type === 'RETURN') {
      // 1. Calculate Late Fee: $25 per overdue hour
      if (now > booking.endDateTime) {
        const overdueHours = Math.ceil((now - booking.endDateTime) / (1000 * 60 * 60));
        lateFee = overdueHours * 25.0;
      }

      // 2. Calculate Fuel Charge: $1.50 per missing percent below 100%
      const pickupInspection = booking.inspections.find((i) => i.type === 'PICKUP');
      const pickupFuel = pickupInspection ? pickupInspection.fuelLevel : 100;
      const returnedFuel = Number(fuelLevel) || 100;

      if (returnedFuel < pickupFuel) {
        const missingPercent = pickupFuel - returnedFuel;
        fuelCharge = Math.round(missingPercent * 1.5 * 100) / 100;
      }

      totalAdditionalFee = Math.round((lateFee + fuelCharge + finalDamageCharge) * 100) / 100;
    }

    const inspection = await prisma.$transaction(async (tx) => {
      const record = await tx.checkinCheckout.create({
        data: {
          bookingId,
          staffId,
          type,
          odometerReading: Number(odometerReading),
          fuelLevel: Number(fuelLevel),
          checklist: typeof checklist === 'object' ? JSON.stringify(checklist) : checklist,
          photos: photos ? (typeof photos === 'object' ? JSON.stringify(photos) : photos) : null,
          damageNotes: damageNotes || null,
          lateFee,
          fuelCharge,
          damageCharge: finalDamageCharge,
          totalAdditionalFee,
          status: 'COMPLETED',
        },
      });

      if (type === 'PICKUP') {
        // Update booking to CHECKED_OUT and vehicle to RENTED
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'CHECKED_OUT' },
        });

        await tx.vehicle.update({
          where: { id: booking.vehicleId },
          data: {
            status: 'RENTED',
            mileage: Number(odometerReading),
          },
        });
      } else if (type === 'RETURN') {
        // Update booking to COMPLETED, update total price with additional fees
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: 'COMPLETED',
            totalPrice: Math.round((booking.totalPrice + totalAdditionalFee) * 100) / 100,
          },
        });

        // If severe damage noted, mark vehicle for MAINTENANCE, else AVAILABLE
        const vehicleStatus = finalDamageCharge > 200 ? 'MAINTENANCE' : 'AVAILABLE';
        await tx.vehicle.update({
          where: { id: booking.vehicleId },
          data: {
            status: vehicleStatus,
            mileage: Number(odometerReading),
          },
        });

        // If damage, auto-create maintenance record
        if (finalDamageCharge > 0) {
          await tx.maintenanceRecord.create({
            data: {
              vehicleId: booking.vehicleId,
              serviceType: 'DAMAGE_REPAIR',
              description: `Post-rental damage repair: ${damageNotes || 'Inspection flagged defects'}`,
              cost: finalDamageCharge,
              scheduledDate: new Date(),
              status: 'SCHEDULED',
            },
          });
        }
      }

      return record;
    });

    await logAudit({
      actorId: staffId,
      action: type === 'PICKUP' ? 'CHECKOUT' : 'RETURN',
      entity: 'CHECKIN_CHECKOUT',
      entityId: inspection.id,
      details: { bookingId, lateFee, fuelCharge, totalAdditionalFee },
      req,
    });

    // Notify customer
    await notificationService.sendInAppNotification({
      userId: booking.customerId,
      title: type === 'PICKUP' ? 'Vehicle Picked Up' : 'Vehicle Returned & Processed',
      message: type === 'PICKUP'
        ? `Your pickup for ${booking.vehicle.make} ${booking.vehicle.model} is complete. Drive safely!`
        : `Return checklist complete. Additional charges: $${totalAdditionalFee.toFixed(2)}. Final invoice updated.`,
      type: 'BOOKING',
    });

    return successResponse(
      res,
      inspection,
      `${type === 'PICKUP' ? 'Pickup check-out' : 'Return check-in'} completed successfully`,
      201
    );
  } catch (err) {
    next(err);
  }
};

const getBookingInspections = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const inspections = await prisma.checkinCheckout.findMany({
      where: { bookingId },
      include: {
        staff: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return successResponse(res, inspections, 'Inspections retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createInspection,
  getBookingInspections,
};
