const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../utils/audit');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 400);
    }

    const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        roleId: customerRole.id,
      },
      include: { role: true },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save hashed refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    await logAudit({
      actorId: user.id,
      action: 'REGISTER',
      entity: 'USER',
      entityId: user.id,
      details: { email: user.email },
      req,
    });

    return successResponse(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.name,
          isVerified: user.isVerified,
          drivingLicenseNumber: user.drivingLicenseNumber,
          drivingLicenseUrl: user.drivingLicenseUrl,
        },
        accessToken,
        refreshToken,
      },
      'Registration successful',
      201
    );
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    await logAudit({
      actorId: user.id,
      action: 'LOGIN',
      entity: 'USER',
      entityId: user.id,
      details: { email: user.email },
      req,
    });

    return successResponse(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.name,
          isVerified: user.isVerified,
          drivingLicenseNumber: user.drivingLicenseNumber,
          drivingLicenseUrl: user.drivingLicenseUrl,
        },
        accessToken,
        refreshToken,
      },
      'Login successful'
    );
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return errorResponse(res, 'Refresh token required', 400);
    }

    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!user || !user.refreshTokenHash) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const isMatch = await bcrypt.compare(token, user.refreshTokenHash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid or revoked refresh token', 401);
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    return successResponse(
      res,
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      'Token refreshed successfully'
    );
  } catch (err) {
    return errorResponse(res, 'Invalid or expired refresh token', 401);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      drivingLicenseNumber: user.drivingLicenseNumber,
      drivingLicenseUrl: user.drivingLicenseUrl,
      isVerified: user.isVerified,
      role: user.role.name,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, drivingLicenseNumber } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(drivingLicenseNumber && { drivingLicenseNumber }),
      },
      include: { role: true },
    });

    return successResponse(res, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      drivingLicenseNumber: user.drivingLicenseNumber,
      drivingLicenseUrl: user.drivingLicenseUrl,
      role: user.role.name,
    }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

const uploadLicense = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Please provide an image or PDF of your driving license', 400);
    }

    const drivingLicenseUrl = `/uploads/${req.file.filename}`;
    const drivingLicenseNumber = req.body.drivingLicenseNumber || req.user.drivingLicenseNumber || 'DL-PENDING';

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        drivingLicenseUrl,
        drivingLicenseNumber,
        isVerified: true, // Auto-verified in demo
      },
      include: { role: true },
    });

    return successResponse(res, {
      drivingLicenseUrl: user.drivingLicenseUrl,
      drivingLicenseNumber: user.drivingLicenseNumber,
      isVerified: user.isVerified,
    }, 'Driving license uploaded and verified successfully');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user?.id) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshTokenHash: null },
      });
    }
    return successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  uploadLicense,
  logout,
};
