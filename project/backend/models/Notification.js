import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["verified", "upvote", "resolved", "comment", "points", "system"],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
