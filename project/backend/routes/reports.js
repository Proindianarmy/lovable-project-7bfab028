import { Router } from "express";
import { body } from "express-validator";
import {
  getReports,
  getReport,
  createReport,
  updateStatus,
  upvote,
  downvote,
  addComment,
  flagSpam,
} from "../controllers/reportsController.js";
import { protect, requireRole } from "../middleware/auth.js";
import { upload, uploadMemory, handleUploadErrors } from "../middleware/upload.js";
import { validate } from "../validators/validate.js";
import { validateImage } from "../controllers/imageValidationController.js";

const router = Router();

router.get("/", getReports);

// Pre-submit image gatekeeper: AI-generation / screenshot / cartoon / unrelated-content
// detection, run before a photo is allowed to be attached to a report. Uses in-memory
// storage so rejected images are never written to disk.
router.post(
  "/validate-image",
  protect,
  handleUploadErrors(uploadMemory.single("image")),
  validateImage,
);

router.get("/:id", getReport);

router.post(
  "/",
  protect,
  handleUploadErrors(upload.array("photos", 5)),
  [
    body("title").trim().isLength({ min: 5, max: 200 }).withMessage("Title must be 5-200 characters."),
    body("description").trim().isLength({ min: 20, max: 5000 }).withMessage("Description must be 20-5000 characters."),
    body("category").isIn(["Roads", "Water", "Electricity", "Sanitation", "Parks", "Safety", "Other"]).withMessage("Invalid category."),
    body("location").trim().isLength({ min: 3 }).withMessage("Location is required."),
  ],
  validate,
  createReport
);

router.put(
  "/:id/status",
  protect,
  requireRole("authority", "admin"),
  [body("status").isIn(["Pending", "In Progress", "Resolved"]).withMessage("Invalid status.")],
  validate,
  updateStatus
);

router.post("/:id/upvote", protect, upvote);
router.post("/:id/downvote", protect, downvote);

router.post(
  "/:id/comments",
  protect,
  [body("text").trim().isLength({ min: 1, max: 1000 }).withMessage("Comment cannot be empty.")],
  validate,
  addComment
);

router.post("/:id/flag-spam", protect, flagSpam);

export default router;
