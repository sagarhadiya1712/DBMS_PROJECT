const prisma = require('../config/db');

/**
 * Calculate full rental price breakdown
 * @param {Object} params
 * @param {string} params.vehicleId
 * @param {Date} params.startDateTime
 * @param {Date} params.endDateTime
 * @param {string} [params.promoCode]
 */
const calculateRentalPrice = async ({ vehicleId, startDateTime, endDateTime, promoCode }) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { branch: true },
  });

  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (end <= start) {
    throw new Error('End date must be strictly after start date');
  }

  const diffMs = end - start;
  const totalHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const totalDays = Math.ceil(totalHours / 24);

  // Check matching pricing rule for branch or vehicle category
  const pricingRule = await prisma.pricingRule.findFirst({
    where: {
      isActive: true,
      OR: [
        { category: vehicle.category },
        { branchId: vehicle.branchId },
        { category: null, branchId: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  const weeklyMultiplier = pricingRule?.weeklyMultiplier ?? 0.85;
  const weekendMultiplier = pricingRule?.weekendMultiplier ?? 1.15;
  let seasonalMultiplier = 1.0;

  if (pricingRule?.seasonalStartDate && pricingRule?.seasonalEndDate) {
    if (start >= pricingRule.seasonalStartDate && start <= pricingRule.seasonalEndDate) {
      seasonalMultiplier = pricingRule.seasonalMultiplier || 1.1;
    }
  }

  // Base calculation
  let basePrice = 0;
  if (totalHours < 24) {
    basePrice = totalHours * vehicle.hourlyRate;
  } else {
    basePrice = totalDays * vehicle.dailyRate;
    // Apply weekly discount if 7+ days
    if (totalDays >= 7) {
      basePrice = basePrice * weeklyMultiplier;
    }
  }

  // Check if dates span a weekend (Saturday = 6, Sunday = 0)
  let includesWeekend = false;
  let cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day === 0 || day === 6) {
      includesWeekend = true;
      break;
    }
    cur.setDate(cur.getDate() + 1);
  }

  if (includesWeekend) {
    basePrice = basePrice * weekendMultiplier;
  }

  basePrice = basePrice * seasonalMultiplier;
  basePrice = Math.round(basePrice * 100) / 100;

  // Promo code validation and discount
  let discountAmount = 0;
  let appliedPromo = null;

  if (promoCode) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: promoCode.trim().toUpperCase() },
    });

    if (promo && promo.isActive) {
      const now = new Date();
      if (now >= promo.validFrom && now <= promo.validUntil) {
        if (!promo.usageLimit || promo.timesUsed < promo.usageLimit) {
          if (basePrice >= promo.minBookingAmount) {
            let discount = (basePrice * promo.discountPercent) / 100;
            if (promo.maxDiscount && discount > promo.maxDiscount) {
              discount = promo.maxDiscount;
            }
            discountAmount = Math.round(discount * 100) / 100;
            appliedPromo = promo;
          }
        }
      }
    }
  }

  const taxableAmount = Math.max(0, basePrice - discountAmount);
  const taxAmount = Math.round(taxableAmount * 0.10 * 100) / 100; // 10% GST/rental tax
  const depositAmount = 3000.0; // Standard refundable security deposit in INR (Rs 3,000)
  const totalPrice = Math.round((taxableAmount + taxAmount + depositAmount) * 100) / 100;

  return {
    vehicle,
    totalHours,
    totalDays,
    dailyRate: vehicle.dailyRate,
    hourlyRate: vehicle.hourlyRate,
    basePrice,
    discountAmount,
    taxAmount,
    depositAmount,
    totalPrice,
    appliedPromo,
    breakdown: {
      isWeeklyDiscountApplied: totalDays >= 7,
      includesWeekend,
      seasonalMultiplier,
    },
  };
};

module.exports = {
  calculateRentalPrice,
};
