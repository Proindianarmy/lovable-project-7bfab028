import { Router } from "express";
import { body } from "express-validator";
import {
  getProfile,
  updateProfile,
  changePassword,
  getLeaderboard,
  setRole,
  getAllUsers,
} from "../controllers/usersController.js";
import { protect, requireRole } from "../middleware/auth.js";
import { validate } from "../validators/validate.js";

const router = Router();

router.get("/leaderboard", getLeaderboard);
router.get("/me", protect, getProfile);

router.put(
  "/me",
  protect,
  [
    body("name").optional().trim().isLength({ min: 2, max: 100 }),
    body("bio").optional().isLength({ max: 500 }),
  ],
  validate,
  updateProfile
);

router.put(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password required."),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters.")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Password must contain uppercase, lowercase, and a number."),
  ],
  validate,
  changePassword
);

router.get("/all", protect, requireRole("admin"), getAllUsers);
router.put("/:id/role", protect, requireRole("admin"), [body("role").isIn(["user", "authority", "admin"])], validate, setRole);

export default router;
