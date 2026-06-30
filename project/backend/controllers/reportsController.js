import Report from "../models/Report.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { success, error } from "../utils/response.js";

// GET /api/reports
export const getReports = async (req, res, next) => {
  try {
    const { category, status, city, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (city) query.city = { $regex: city, $options: "i" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Report.countDocuments(query),
    ]);

    return success(res, {
      reports,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/:id
export const getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) return error(res, "Report not found.", 404);
    return success(res, { report });
  } catch (err) {
    next(err);
  }
};

// POST /api/reports
export const createReport = async (req, res, next) => {
  try {
    const { title, description, category, location, city, state, pincode, lat, lng, urgency, aiTags, aiConfidence } = req.body;

    // Check for duplicate (same category + location + same reporter within 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await Report.findOne({
      reporter: req.user._id,
      category,
      location: { $regex: location.trim(), $options: "i" },
      createdAt: { $gte: oneDayAgo },
    });

    if (duplicate) {
      return error(res, "A similar report was already submitted by you in the last 24 hours.", 409);
    }

    // Handle uploaded photo paths
    const photos = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    const report = await Report.create({
      title,
      description,
      category,
      location,
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      urgency: urgency || "Medium",
      reporter: req.user._id,
      reporterName: req.user.name,
      reporterAvatar: req.user.avatar,
      photos,
      aiTags: aiTags ? JSON.parse(aiTags) : [],
      aiConfidence: aiConfidence ? parseInt(aiConfidence) : undefined,
    });

    // Award points to reporter
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 10 } });

    return success(res, { report }, "Report submitted successfully!", 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/reports/:id/status  (authority/admin only)
export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!report) return error(res, "Report not found.", 404);

    // Notify reporter
    if (status === "Resolved") {
      await Notification.create({
        userId: report.reporter,
        type: "resolved",
        title: "Your report was resolved!",
        body: `"${report.title}" has been marked as resolved.`,
        reportId: report._id,
      });
      await User.findByIdAndUpdate(report.reporter, { $inc: { points: 20 } });
    }

    return success(res, { report }, "Status updated.");
  } catch (err) {
    next(err);
  }
};

// POST /api/reports/:id/upvote
export const upvote = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return error(res, "Report not found.", 404);

    const uid = req.user._id.toString();
    const alreadyUpvoted = report.upvotes.map((u) => u.toString()).includes(uid);
    const alreadyDownvoted = report.downvotes.map((u) => u.toString()).includes(uid);

    if (alreadyUpvoted) {
      report.upvotes.pull(req.user._id);
    } else {
      report.upvotes.push(req.user._id);
      if (alreadyDownvoted) report.downvotes.pull(req.user._id);

      // Notify reporter (not self)
      if (report.reporter.toString() !== uid) {
        await Notification.create({
          userId: report.reporter,
          type: "upvote",
          title: "Someone supported your report",
          body: `"${report.title}" received an upvote.`,
          reportId: report._id,
        });
      }
    }

    await report.save();
    return success(res, { upvotes: report.upvotes.length, downvotes: report.downvotes.length, wasUpvoted: alreadyUpvoted });
  } catch (err) {
    next(err);
  }
};

// POST /api/reports/:id/downvote
export const downvote = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return error(res, "Report not found.", 404);

    const uid = req.user._id.toString();
    const alreadyDownvoted = report.downvotes.map((u) => u.toString()).includes(uid);
    const alreadyUpvoted = report.upvotes.map((u) => u.toString()).includes(uid);

    if (alreadyDownvoted) {
      report.downvotes.pull(req.user._id);
    } else {
      report.downvotes.push(req.user._id);
      if (alreadyUpvoted) report.upvotes.pull(req.user._id);
    }

    await report.save();
    return success(res, { upvotes: report.upvotes.length, downvotes: report.downvotes.length });
  } catch (err) {
    next(err);
  }
};

// POST /api/reports/:id/comments
export const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return error(res, "Report not found.", 404);

    report.comments.push({ userId: req.user._id, userName: req.user.name, text });
    await report.save();

    // Notify reporter
    if (report.reporter.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId: report.reporter,
        type: "comment",
        title: "New comment on your report",
        body: `${req.user.name} commented on "${report.title}".`,
        reportId: report._id,
      });
    }

    return success(res, { comments: report.comments }, "Comment added.", 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/reports/:id/flag-spam
export const flagSpam = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return error(res, "Report not found.", 404);

    const uid = req.user._id.toString();
    if (!report.spamFlags.map((u) => u.toString()).includes(uid)) {
      report.spamFlags.push(req.user._id);
      await report.save();
    }
    return success(res, { flags: report.spamFlags.length });
  } catch (err) {
    next(err);
  }
};
