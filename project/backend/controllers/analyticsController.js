import Report from "../models/Report.js";
import User from "../models/User.js";
import { success } from "../utils/response.js";

// GET /api/analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const [totalReports, totalUsers, byCategory, byStatus, recent] = await Promise.all([
      Report.countDocuments(),
      User.countDocuments({ verified: true }),
      Report.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
      Report.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Report.find({}).sort({ createdAt: -1 }).limit(5).select("title category status createdAt").lean(),
    ]);

    // Trend: last 7 days grouped by day
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trend = await Report.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return success(res, {
      totalReports,
      totalUsers,
      byCategory,
      byStatus,
      recent,
      trend,
    });
  } catch (err) {
    next(err);
  }
};
