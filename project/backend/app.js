import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import reportRoutes from "./routes/reports.js";
import userRoutes from "./routes/users.js";
import notificationRoutes from "./routes/notifications.js";
import analyticsRoutes from "./routes/analytics.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── CORS — must be registered BEFORE helmet and all routes ────────────────
// This also handles OPTIONS preflight automatically when cors() is used here.
const rawOrigins = process.env.CORS_ORIGIN || "http://localhost:5173";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Always include common dev origins so the app works out-of-the-box
const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080", // this project's default Vite dev port
  "http://localhost:4173", // vite preview
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];
if (process.env.NODE_ENV !== "production") {
  DEV_ORIGINS.forEach((o) => {
    if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
  });
}

const corsOptions = {
  origin: (origin, cb) => {
    // Allow server-to-server calls (no origin header) and allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count"],
  optionsSuccessStatus: 200, // Some older browsers choke on 204
};

// Handle OPTIONS preflight for ALL routes explicitly — must come first
app.options("*", cors(corsOptions));

// Apply CORS to all subsequent routes
app.use(cors(corsOptions));

// ── Security headers (after CORS so it doesn't interfere with preflight) ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow images from /uploads
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── NoSQL injection protection ────────────────────────────────────────────
app.use(mongoSanitize());

// ── HTTP logging (dev only) ───────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ── Global rate limiter ───────────────────────────────────────────────────
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please slow down." },
  })
);

// ── Static uploads ────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API Routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);

// ── Health check ──────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "IssueSnap API is running 🚀",
    timestamp: new Date().toISOString(),
    allowedOrigins,
  });
});

// ── Error handling ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
