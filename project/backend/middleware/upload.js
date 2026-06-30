import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

// Ensure the uploads directory exists regardless of the process's CWD —
// prevents a multer ENOENT crash on first file upload.
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error("Only image files are allowed (jpeg, jpg, png, webp, gif)."));
};

// 15MB per file — comfortably covers modern phone camera photos (typically 8-12MB)
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

// In-memory variant used for the pre-submit /validate-image check —
// we never want to persist a rejected (AI-generated / unrelated) photo
// to disk, so this instance keeps the buffer in RAM only.
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

// Wraps multer's upload.array/single so its generic errors become clear,
// user-facing messages instead of raw Multer error codes leaking through.
export const handleUploadErrors = (uploaderMiddleware) => (req, res, next) => {
  uploaderMiddleware(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: `Each photo must be under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB. Please compress or resize your image and try again.`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ success: false, message: "Too many photos — maximum 5 per report." });
    }
    return res.status(400).json({ success: false, message: err.message || "File upload failed." });
  });
};
