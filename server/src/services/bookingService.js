const prisma = require('../config/db');

/**
 * Check if vehicle is available for given datetime range
 * Strictly checks for any overlapping active bookings:
 * overlapping iff existing.start < requested.end AND existing.end > requested.start
 * @param {string} vehicleId
 * @param {Date} startDateTime
 * @param {Date} endDateTime
 * @param {string} [excludeBookingId]
 */
const checkVehicleAvailability = async (vehicleId, startDateTime, endDateTime, excludeBookingId = null) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  // Check vehicle status
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    return { available: false, reason: 'Vehicle does not exist' };
  }

  if (vehicle.status === 'MAINTENANCE') {
    return { available: false, reason: 'Vehicle is currently under maintenance' };
  }

  if (vehicle.status === 'RETIRED') {
    return { available: false, reason: 'Vehicle has been retired from active fleet' };
  }

  // Find any active overlapping booking
  const whereClause = {
    vehicleId,
    status: {
      in: ['CONFIRMED', 'CHECKED_OUT', 'PENDING'],
    },
    AND: [
      { startDateTime: { lt: end } },
      { endDateTime: { gt: start } },
    ],
  };

  if (excludeBookingId) {
    whereClause.id = { not: excludeBookingId };
  }

  const conflictingBooking = await prisma.booking.findFirst({
    where: whereClause,
  });

  if (conflictingBooking) {
    return {
      available: false,
      reason: `Vehicle already booked from ${conflictingBooking.startDateTime.toISOString()} to ${conflictingBooking.endDateTime.toISOString()}`,
      conflictingBooking,
    };
  }

  return { available: true };
};

/**
 * Generates an alphanumeric booking reference code: e.g. BK-2026-X891A
 */
const generateBookingReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${new Date().getFullYear()}-${rand}`;
};

module.exports = {
  checkVehicleAvailability,
  generateBookingReference,
};
