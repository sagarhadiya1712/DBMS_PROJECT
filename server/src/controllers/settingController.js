const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit } = require('../utils/audit');

/**
 * GET /api/settings
 * Public endpoint to fetch all active system & company settings
 */
const getPublicSettings = async (req, res, next) => {
  try {
    const settingsList = await prisma.systemSetting.findMany();

    // Map into key-value map for quick frontend consumption
    const settings = {};
    for (const s of settingsList) {
      try {
        // Parse JSON values if applicable (e.g. fleet_categories)
        settings[s.key] = s.value.startsWith('[') || s.value.startsWith('{')
          ? JSON.parse(s.value)
          : s.value;
      } catch (e) {
        settings[s.key] = s.value;
      }
    }

    return successResponse(res, settings, 'System settings retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/settings/admin
 * Admin endpoint to fetch full setting objects with metadata
 */
const getAllSettingsAdmin = async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    return successResponse(res, settings, 'All settings retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/settings
 * Admin endpoint to update multiple system settings
 * Body: { settings: { key: value, ... } }
 */
const updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return errorResponse(res, 'Invalid settings payload', 400);
    }

    const updated = [];
    for (const [key, rawValue] of Object.entries(settings)) {
      const valStr = typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue);
      const record = await prisma.systemSetting.upsert({
        where: { key },
        update: { value: valStr },
        create: {
          key,
          value: valStr,
          category: 'CUSTOM',
        },
      });
      updated.push(record);
    }

    await logAudit({
      actorId: req.user.id,
      action: 'UPDATE',
      entity: 'SYSTEM_SETTINGS',
      entityId: 'global',
      details: { updatedKeys: Object.keys(settings) },
      req,
    });

    return successResponse(res, updated, 'Settings updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicSettings,
  getAllSettingsAdmin,
  updateSettings,
};
