import "dotenv/config";
import connectDB from "./config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

// ── Seed admin user if not present ────────────────────────────────────────
async function seedAdmin() {
  try {
    const { default: User } = await import("./models/User.js");
    const adminEmail = process.env.ADMIN_EMAIL || "admin@issuesnap.com";
    const exists = await User.findOne({ email: adminEmail });
    if (!exists) {
      await User.create({
        name: "Admin",
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || "Admin@1234",
        role: "admin",
        verified: true,
        avatar: "🛡️",
        points: 9999,
      });
      console.log(`✅ Admin user seeded: ${adminEmail}`);
    }
  } catch (err) {
    // Non-fatal — log and continue
    console.error("⚠️  Seed error:", err.message);
  }
}

// ── Start ──────────────────────────────────────────────────────────────────
async function start() {
  // Connect to DB first — if this fails, the process exits cleanly via connectDB()
  await connectDB();

  // Seed admin (non-fatal)
  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`\n🚀 IssueSnap backend running on port ${PORT}`);
    console.log(`📡 API:         http://localhost:${PORT}/api`);
    console.log(`❤️  Health:      http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

    const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASS);
    if (!hasSmtp && !hasGmail) {
      console.log(`📧 Email mode:   CONSOLE ONLY (no SMTP_* or GMAIL_* vars set — OTPs will print here, not be emailed)\n`);
    } else {
      console.log(`📧 Email mode:   credentials detected — run a test OTP to confirm Gmail/SMTP accepts them.\n`);
    }
  });
}

// ── Unhandled error safety nets ────────────────────────────────────────────
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

start();
