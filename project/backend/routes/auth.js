import { Router } from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import {
  register,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../validators/validate.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many OTP requests. Try again in 15 minutes." },
});

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters."),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters.")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Password must contain uppercase, lowercase, and a number."),
  ],
  validate,
  register
);

router.post(
  "/verify-otp",
  otpLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("otp").isLength({ min: 6, max: 6 }).isNumeric().withMessage("OTP must be 6 digits."),
  ],
  validate,
  verifyOtp
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required."),
    body("password").notEmpty().withMessage("Password required."),
  ],
  validate,
  login
);

router.post(
  "/resend-otp",
  otpLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("purpose").isIn(["verify", "reset"]),
  ],
  validate,
  resendOtp
);

router.post(
  "/forgot-password",
  otpLimiter,
  [body("email").isEmail().normalizeEmail().withMessage("Valid email required.")],
  validate,
  forgotPassword
);

router.post(
  "/verify-reset-otp",
  otpLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("otp").isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  validate,
  verifyResetOtp
);

router.post(
  "/reset-password",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters.")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Password must contain uppercase, lowercase, and a number."),
  ],
  validate,
  resetPassword
);

router.get("/me", protect, getMe);

export default router;
