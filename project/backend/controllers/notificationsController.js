import Notification from "../models/Notification.js";
import { success } from "../utils/response.js";

// GET /api/notifications
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unread = notifications.filter((n) => !n.read).length;
    return success(res, { notifications, unread });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/:id/read
export const markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    );
    return success(res, {}, "Marked as read.");
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    return success(res, {}, "All notifications marked as read.");
  } catch (err) {
    next(err);
  }
};
