import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  purpose: { type: String, enum: ["verify", "reset"], required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // auto-delete after 10 min
});

otpSchema.index({ email: 1, purpose: 1 });

export default mongoose.model("OTP", otpSchema);
