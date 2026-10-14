const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const getVehicles = async (req, res, next) => {
  try {
    const {
      category,
      seats,
      minPrice,
      maxPrice,
      branchId,
      transmission,
      fuelType,
      status,
      startDateTime,
      endDateTime,
      search,
    } = req.query;

    const where = {};

    if (category) where.category = category;
    if (transmission) where.transmission = transmission;
    if (fuelType) where.fuelType = fuelType;
    if (branchId) where.branchId = branchId;
    if (status) {
      where.status = status;
    } else {
      // Default: show available for customers
      where.status = { not: 'RETIRED' };
    }

    if (seats) {
      where.seatingCapacity = { gte: Number(seats) };
    }

    if (minPrice || maxPrice) {
      where.dailyRate = {};
      if (minPrice) where.dailyRate.gte = Number(minPrice);
      if (maxPrice) where.dailyRate.lte = Number(maxPrice);
    }

    if (search) {
      where.OR = [
        { make: { contains: search } },
        { model: { contains: search } },
        { licensePlate: { contains: search } },
      ];
    }

    // Filter vehicles by date availability if date range specified
    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);

      // Subquery/relation filter: vehicle has no overlapping bookings
      where.bookings = {
        none: {
          status: { in: ['CONFIRMED', 'CHECKED_OUT', 'PENDING'] },
          AND: [
            { startDateTime: { lt: end } },
            { endDateTime: { gt: start } },
          ],
        },
      };
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        images: true,
        branch: true,
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average rating
    const enriched = vehicles.map((v) => {
      const totalRatings = v.reviews.length;
      const avgRating = totalRatings > 0
        ? Math.round((v.reviews.reduce((acc, r) => acc + r.rating, 0) / totalRatings) * 10) / 10
        : 5.0; // default 5.0 for fresh fleet

      return {
        ...v,
        avgRating,
        totalReviews: totalRatings,
        primaryImage: v.images.find((img) => img.isPrimary)?.imageUrl || v.images[0]?.imageUrl || null,
      };
    });

    return successResponse(res, enriched, 'Vehicles retrieved');
  } catch (err) {
    next(err);
  }
};

const getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        images: true,
        documents: true,
        branch: true,
        reviews: {
          include: {
            customer: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_OUT'] },
            endDateTime: { gte: new Date() },
          },
          select: {
            id: true,
            startDateTime: true,
            endDateTime: true,
            status: true,
          },
        },
      },
    });

    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', 404);
    }

    const totalRatings = vehicle.reviews.length;
    const avgRating = totalRatings > 0
      ? Math.round((vehicle.reviews.reduce((acc, r) => acc + r.rating, 0) / totalRatings) * 10) / 10
      : 5.0;

    return successResponse(res, {
      ...vehicle,
      avgRating,
      totalReviews: totalRatings,
    }, 'Vehicle details retrieved');
  } catch (err) {
    next(err);
  }
};

const createVehicle = async (req, res, next) => {
  try {
    const {
      vin,
      licensePlate,
      make,
      model,
      year,
      category,
      transmission,
      fuelType,
      seatingCapacity,
      mileage,
      dailyRate,
      hourlyRate,
      color,
      features,
      branchId,
      status = 'AVAILABLE',
      imageUrl,
    } = req.body;

    // Constraint: Only ONE vehicle can have category LUXURY_TAXI
    if (category === 'LUXURY_TAXI') {
      const existingLuxury = await prisma.vehicle.findFirst({
        where: {
          category: 'LUXURY_TAXI',
          status: { not: 'RETIRED' },
        },
      });
      if (existingLuxury) {
        return errorResponse(res, 'Only ONE vehicle in the fleet can have category LUXURY_TAXI.', 400);
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        vin,
        licensePlate,
        make,
        model,
        year: Number(year),
        category,
        transmission,
        fuelType,
        seatingCapacity: Number(seatingCapacity) || 5,
        mileage: Number(mileage) || 0,
        dailyRate: Number(dailyRate),
        hourlyRate: Number(hourlyRate),
        color,
        features,
        branchId,
        status,
        ...(imageUrl && {
          images: {
            create: {
              imageUrl,
              isPrimary: true,
            },
          },
        }),
      },
      include: {
        images: true,
        branch: true,
      },
    });

    await logAudit({
      actorId: req.user.id,
      action: 'CREATE',
      entity: 'VEHICLE',
      entityId: vehicle.id,
      details: { vin: vehicle.vin, licensePlate: vehicle.licensePlate },
      req,
    });

    return successResponse(res, vehicle, 'Vehicle added to fleet successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.category === 'LUXURY_TAXI') {
      const existingLuxury = await prisma.vehicle.findFirst({
        where: {
          category: 'LUXURY_TAXI',
          status: { not: 'RETIRED' },
          id: { not: id },
        },
      });
      if (existingLuxury) {
        return errorResponse(res, 'Only ONE vehicle in the fleet can have category LUXURY_TAXI.', 400);
      }
    }

    if (updateData.year) updateData.year = Number(updateData.year);
    if (updateData.seatingCapacity) updateData.seatingCapacity = Number(updateData.seatingCapacity);
    if (updateData.mileage) updateData.mileage = Number(updateData.mileage);
    if (updateData.dailyRate) updateData.dailyRate = Number(updateData.dailyRate);
    if (updateData.hourlyRate) updateData.hourlyRate = Number(updateData.hourlyRate);

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: { images: true, branch: true },
    });

    await logAudit({
      actorId: req.user.id,
      action: 'UPDATE',
      entity: 'VEHICLE',
      entityId: vehicle.id,
      details: updateData,
      req,
    });

    return successResponse(res, vehicle, 'Vehicle updated');
  } catch (err) {
    next(err);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Soft delete/retire to prevent orphaned historical bookings
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { status: 'RETIRED' },
    });

    await logAudit({
      actorId: req.user.id,
      action: 'RETIRE',
      entity: 'VEHICLE',
      entityId: vehicle.id,
      details: { status: 'RETIRED' },
      req,
    });

    return successResponse(res, vehicle, 'Vehicle retired from fleet');
  } catch (err) {
    next(err);
  }
};

const uploadVehicleImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return errorResponse(res, 'No image file uploaded', 400);
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const isPrimary = req.body.isPrimary === 'true';

    if (isPrimary) {
      await prisma.vehicleImage.updateMany({
        where: { vehicleId: id },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.vehicleImage.create({
      data: {
        vehicleId: id,
        imageUrl,
        isPrimary,
        caption: req.body.caption || null,
      },
    });

    return successResponse(res, image, 'Image added successfully', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  uploadVehicleImage,
};
