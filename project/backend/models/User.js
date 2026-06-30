import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    password: { type: String, required: true, minlength: 8 },
    avatar: { type: String, default: "🦊" },
    bio: { type: String, default: "", maxlength: 500 },
    city: { type: String, default: "" },
    points: { type: Number, default: 0 },
    role: { type: String, enum: ["user", "authority", "admin"], default: "user" },
    notifyEmail: { type: Boolean, default: true },
    notifyPush: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    lastDailyBonus: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);
