import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { signToken } from "../utils/jwt.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail, sendWelcomeEmail } from "../services/emailService.js";
import { success, error } from "../utils/response.js";

const MAX_OTP_ATTEMPTS = 5;

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return error(res, "An account with this email already exists.", 409);

    // Create user (unverified)
    const user = await User.create({ name, email, password, verified: false });

    // Generate & send OTP
    const otp = generateOtp();
    await OTP.deleteMany({ email: email.toLowerCase(), purpose: "verify" });
    await OTP.create({ email: email.toLowerCase(), otp, purpose: "verify" });

    try {
      await sendOtpEmail(email, otp, "verify");
    } catch (emailErr) {
      // Roll back user creation if email fails, so user can retry registration
      await User.deleteOne({ _id: user._id });
      await OTP.deleteMany({ email: email.toLowerCase(), purpose: "verify" });
      return error(res, emailErr.message || "Could not send verification email. Please try again.", 500);
    }

    return success(res, { email: user.email }, "Registration successful. Check your email for the OTP.", 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const lowerEmail = email.toLowerCase();

    const record = await OTP.findOne({ email: lowerEmail, purpose: "verify" });
    if (!record) return error(res, "OTP expired or not found. Please register again.", 400);

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteOne({ _id: record._id });
      return error(res, "Too many failed attempts. Please register again.", 429);
    }

    if (record.otp !== otp.trim()) {
      record.attempts += 1;
      await record.save();
      return error(res, `Incorrect OTP. ${MAX_OTP_ATTEMPTS - record.attempts} attempts remaining.`, 400);
    }

    // OTP correct — verify user
    await OTP.deleteOne({ _id: record._id });
    const user = await User.findOneAndUpdate(
      { email: lowerEmail },
      { verified: true },
      { new: true }
    );

    if (!user) return error(res, "User not found.", 404);

    // Welcome email is non-critical — failure here must not break login
    await sendWelcomeEmail(email, user.name);

    const token = signToken(user._id);
    return success(res, { token, user }, "Email verified successfully!");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      return error(res, "Invalid email or password.", 401);
    }

    if (!user.verified) {
      // Re-send OTP — email failure should not hard-crash
      const otp = generateOtp();
      await OTP.deleteMany({ email: email.toLowerCase(), purpose: "verify" });
      await OTP.create({ email: email.toLowerCase(), otp, purpose: "verify" });

      try {
        await sendOtpEmail(email, otp, "verify");
      } catch (emailErr) {
        return error(res, "Email not verified. Failed to resend OTP — please check your email configuration.", 500);
      }

      return error(res, "Email not verified. A new OTP has been sent to your email.", 403);
    }

    // Daily login bonus
    const today = new Date().toDateString();
    const lastBonus = user.lastDailyBonus ? new Date(user.lastDailyBonus).toDateString() : null;
    let bonusAwarded = false;
    if (lastBonus !== today) {
      user.points += 5;
      user.lastDailyBonus = new Date();
      await user.save();
      bonusAwarded = true;
    }

    const token = signToken(user._id);
    return success(res, { token, user, bonusAwarded }, "Login successful!");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-otp
export const resendOtp = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;
    const lowerEmail = email.toLowerCase();

    const user = await User.findOne({ email: lowerEmail });
    if (!user) return error(res, "No account found with this email.", 404);

    if (purpose === "verify" && user.verified) {
      return error(res, "Email is already verified.", 400);
    }

    const otp = generateOtp();
    await OTP.deleteMany({ email: lowerEmail, purpose });
    await OTP.create({ email: lowerEmail, otp, purpose });

    try {
      await sendOtpEmail(email, otp, purpose);
    } catch (emailErr) {
      return error(res, emailErr.message || "Could not send OTP email. Please try again.", 500);
    }

    return success(res, {}, "OTP sent successfully.");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const lowerEmail = email.toLowerCase();

    const user = await User.findOne({ email: lowerEmail });
    // Always return success to prevent user enumeration
    if (!user) {
      return success(res, {}, "If an account exists, a reset OTP has been sent.");
    }

    const otp = generateOtp();
    await OTP.deleteMany({ email: lowerEmail, purpose: "reset" });
    await OTP.create({ email: lowerEmail, otp, purpose: "reset" });

    try {
      await sendOtpEmail(email, otp, "reset");
    } catch (emailErr) {
      return error(res, emailErr.message || "Could not send reset email. Please try again.", 500);
    }

    return success(res, {}, "If an account exists, a reset OTP has been sent.");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-reset-otp
export const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const lowerEmail = email.toLowerCase();

    const record = await OTP.findOne({ email: lowerEmail, purpose: "reset" });
    if (!record) return error(res, "OTP expired or not found. Please request a new one.", 400);

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteOne({ _id: record._id });
      return error(res, "Too many failed attempts. Please request a new OTP.", 429);
    }

    if (record.otp !== otp.trim()) {
      record.attempts += 1;
      await record.save();
      return error(res, "Incorrect OTP.", 400);
    }

    // Mark OTP as verified
    record.otp = "VERIFIED";
    record.purpose = "reset";
    record.attempts = 0;
    await record.save();

    return success(res, {}, "OTP verified. You may now reset your password.");
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();

    // Ensure OTP was verified
    const record = await OTP.findOne({ email: lowerEmail, purpose: "reset", otp: "VERIFIED" });
    if (!record) return error(res, "Session expired. Please restart the password reset process.", 400);

    const user = await User.findOne({ email: lowerEmail });
    if (!user) return error(res, "User not found.", 404);

    user.password = password; // pre-save hook hashes it
    await user.save();
    await OTP.deleteMany({ email: lowerEmail });

    return success(res, {}, "Password reset successfully. You can now log in.");
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  return success(res, { user: req.user });
};
