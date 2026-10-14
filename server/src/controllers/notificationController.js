const prisma = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    return successResponse(res, { notifications, unreadCount }, 'Notifications retrieved');
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    return successResponse(res, notification, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id },
      data: { isRead: true },
    });
    return successResponse(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
