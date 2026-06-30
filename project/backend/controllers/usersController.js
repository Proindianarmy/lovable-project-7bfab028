import User from "../models/User.js";
import Report from "../models/Report.js";
import { success, error } from "../utils/response.js";

// GET /api/users/me
export const getProfile = async (req, res) => {
  return success(res, { user: req.user });
};

// PUT /api/users/me
export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, city, avatar, notifyEmail, notifyPush } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (city !== undefined) updates.city = city;
    if (avatar !== undefined) updates.avatar = avatar;
    if (notifyEmail !== undefined) updates.notifyEmail = notifyEmail;
    if (notifyPush !== undefined) updates.notifyPush = notifyPush;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return success(res, { user }, "Profile updated.");
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(currentPassword))) {
      return error(res, "Current password is incorrect.", 400);
    }

    user.password = newPassword;
    await user.save();
    return success(res, {}, "Password changed successfully.");
  } catch (err) {
    next(err);
  }
};

// GET /api/users/leaderboard
export const getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find({ verified: true })
      .sort({ points: -1 })
      .limit(50)
      .select("name avatar points city role")
      .lean();

    const reportCounts = await Report.aggregate([
      { $group: { _id: "$reporter", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    reportCounts.forEach((r) => { countMap[r._id.toString()] = r.count; });

    const enriched = users.map((u, i) => ({
      ...u,
      rank: i + 1,
      reportCount: countMap[u._id.toString()] || 0,
    }));

    return success(res, { leaderboard: enriched });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id/role  (admin only)
export const setRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return error(res, "User not found.", 404);
    return success(res, { user }, "Role updated.");
  } catch (err) {
    next(err);
  }
};

// GET /api/users/all  (admin)
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password").lean();
    return success(res, { users });
  } catch (err) {
    next(err);
  }
};
