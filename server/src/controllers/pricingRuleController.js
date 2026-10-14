const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const listPricingRules = async (req, res, next) => {
  try {
    const rules = await prisma.pricingRule.findMany({
      include: { branch: true },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(res, rules, 'Pricing rules retrieved');
  } catch (err) {
    next(err);
  }
};

const createPricingRule = async (req, res, next) => {
  try {
    const {
      name,
      category,
      branchId,
      hourlyRate,
      dailyRate,
      weeklyMultiplier = 0.9,
      weekendMultiplier = 1.15,
      seasonalStartDate,
      seasonalEndDate,
      seasonalMultiplier = 1.0,
    } = req.body;

    const rule = await prisma.pricingRule.create({
      data: {
        name,
        category: category || null,
        branchId: branchId || null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        dailyRate: dailyRate ? Number(dailyRate) : null,
        weeklyMultiplier: Number(weeklyMultiplier),
        weekendMultiplier: Number(weekendMultiplier),
        seasonalStartDate: seasonalStartDate ? new Date(seasonalStartDate) : null,
        seasonalEndDate: seasonalEndDate ? new Date(seasonalEndDate) : null,
        seasonalMultiplier: Number(seasonalMultiplier),
      },
    });

    return successResponse(res, rule, 'Pricing rule created', 201);
  } catch (err) {
    next(err);
  }
};

const listPromos = async (req, res, next) => {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(res, promos, 'Promo codes retrieved');
  } catch (err) {
    next(err);
  }
};

const createPromo = async (req, res, next) => {
  try {
    const {
      code,
      description,
      discountPercent,
      maxDiscount,
      minBookingAmount = 0,
      validFrom,
      validUntil,
      usageLimit = 100,
    } = req.body;

    const promo = await prisma.promoCode.create({
      data: {
        code: code.trim().toUpperCase(),
        description,
        discountPercent: Number(discountPercent),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        minBookingAmount: Number(minBookingAmount),
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: new Date(validUntil),
        usageLimit: Number(usageLimit),
      },
    });

    return successResponse(res, promo, 'Promo code created', 201);
  } catch (err) {
    next(err);
  }
};

const validatePromo = async (req, res, next) => {
  try {
    const { code, amount = 0 } = req.body;
    if (!code) {
      return errorResponse(res, 'Promo code required', 400);
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promo || !promo.isActive) {
      return errorResponse(res, 'Invalid promo code', 400);
    }

    const now = new Date();
    if (now < promo.validFrom || now > promo.validUntil) {
      return errorResponse(res, 'Promo code has expired or is not yet active', 400);
    }

    if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
      return errorResponse(res, 'Promo code usage limit reached', 400);
    }

    if (Number(amount) < promo.minBookingAmount) {
      return errorResponse(res, `Minimum booking amount for this code is $${promo.minBookingAmount}`, 400);
    }

    let discount = (Number(amount) * promo.discountPercent) / 100;
    if (promo.maxDiscount && discount > promo.maxDiscount) {
      discount = promo.maxDiscount;
    }

    return successResponse(res, {
      code: promo.code,
      discountPercent: promo.discountPercent,
      discountAmount: Math.round(discount * 100) / 100,
      description: promo.description,
    }, 'Promo code valid');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPricingRules,
  createPricingRule,
  listPromos,
  createPromo,
  validatePromo,
};
