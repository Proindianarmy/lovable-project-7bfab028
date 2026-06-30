import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: {
      type: String,
      enum: ["Roads", "Water", "Electricity", "Sanitation", "Parks", "Safety", "Other"],
      required: true,
    },
    location: { type: String, required: true, trim: true },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    lat: { type: Number },
    lng: { type: Number },
    urgency: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },
    photos: [{ type: String }],
    aiTags: [{ type: String }],
    aiConfidence: { type: Number },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reporterName: { type: String, required: true },
    reporterAvatar: { type: String, default: "🦊" },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
    spamFlags: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    censored: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reportSchema.index({ category: 1, status: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ createdAt: -1 });

export default mongoose.model("Report", reportSchema);
