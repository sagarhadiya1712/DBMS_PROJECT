const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const listBranches = async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        _count: { select: { vehicles: true } },
      },
      orderBy: { name: 'asc' },
    });
    return successResponse(res, branches, 'Branches retrieved');
  } catch (err) {
    next(err);
  }
};

const createBranch = async (req, res, next) => {
  try {
    const { name, code, address, city, state, postalCode, phone, email, operatingHours } = req.body;
    const branch = await prisma.branch.create({
      data: { name, code, address, city, state, postalCode, phone, email, operatingHours },
    });
    return successResponse(res, branch, 'Branch created', 201);
  } catch (err) {
    next(err);
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.update({
      where: { id },
      data: req.body,
    });
    return successResponse(res, branch, 'Branch updated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listBranches,
  createBranch,
  updateBranch,
};
