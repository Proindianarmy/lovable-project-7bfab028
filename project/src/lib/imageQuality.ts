/* ─────────────────────────────────────────────────────────────────────────
 * Client-side image quality & format validation.
 *
 * Runs instantly in the browser, before any network round-trip, so users get
 * fast feedback on obviously bad photos (wrong format, too small, too dark,
 * blurry, too low-resolution) without waiting on the server.
 *
 * Server-side (backend/controllers/imageValidationController.js) still does
 * the authoritative AI-generation + civic-issue content check, since that
 * can't be trusted to the client alone.
 * ───────────────────────────────────────────────────────────────────────── */

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const MIN_IMAGE_SIZE_BYTES = 5 * 1024; // 5KB — guards against corrupt/empty files

export const MIN_WIDTH = 360;
export const MIN_HEIGHT = 360;

export interface QualityCheckResult {
  ok: boolean;
  reason?: string;
  meta: {
    width: number;
    height: number;
    sizeBytes: number;
    brightness: number; // 0-255 average luminance
    sharpness: number; // relative Laplacian-variance sharpness score
    isLikelyBlurry: boolean;
    isLikelyDark: boolean;
  };
}

/** Quick format + size check before we even decode the image. */
export function validateFormatAndSize(file: File): { ok: boolean; reason?: string } {
  const typeOk = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const extOk = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!typeOk && !extOk) {
    return { ok: false, reason: "Unsupported file type. Please upload a JPG, JPEG, PNG or WEBP image." };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      reason: `This photo is ${(file.size / (1024 * 1024)).toFixed(1)}MB — please use a photo under ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`,
    };
  }
  if (file.size < MIN_IMAGE_SIZE_BYTES) {
    return { ok: false, reason: "This file is too small to be a valid photo." };
  }
  return { ok: true };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image file."));
    img.src = src;
  });
}

/** Downscale to a small grayscale buffer and compute brightness + sharpness signals. */
function analyzePixels(img: HTMLImageElement): { brightness: number; sharpness: number } {
  const size = 200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const gray = new Float32Array(size * size);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = lum;
    sum += lum;
  }
  const brightness = sum / gray.length;

  // Laplacian (edge-detection) variance — low variance ≈ blurry/flat image.
  let lapSum = 0;
  let lapSumSq = 0;
  let count = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const lap =
        4 * gray[idx] -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - size] -
        gray[idx + size];
      lapSum += lap;
      lapSumSq += lap * lap;
      count++;
    }
  }
  const lapMean = lapSum / count;
  const variance = lapSumSq / count - lapMean * lapMean;

  return { brightness, sharpness: variance };
}

/**
 * Full client-side quality pass: decodes the image, checks resolution,
 * brightness (too dark) and sharpness (too blurry).
 */
export async function checkImageQuality(file: File): Promise<QualityCheckResult> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  const { brightness, sharpness } = analyzePixels(img);

  const isLikelyDark = brightness < 35;
  // Threshold tuned empirically: real, in-focus phone photos score well above
  // this; visibly blurry/out-of-focus shots fall below it.
  const isLikelyBlurry = sharpness < 18;

  const meta = {
    width: img.naturalWidth,
    height: img.naturalHeight,
    sizeBytes: file.size,
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness * 10) / 10,
    isLikelyBlurry,
    isLikelyDark,
  };

  if (img.naturalWidth < MIN_WIDTH || img.naturalHeight < MIN_HEIGHT) {
    return {
      ok: false,
      reason: `Image resolution is too low (${img.naturalWidth}×${img.naturalHeight}). Please use a photo at least ${MIN_WIDTH}×${MIN_HEIGHT}px.`,
      meta,
    };
  }
  if (isLikelyDark) {
    return {
      ok: false,
      reason: "This photo looks too dark to clearly show the issue. Please retake it in better lighting.",
      meta,
    };
  }
  if (isLikelyBlurry) {
    return {
      ok: false,
      reason: "This photo looks blurry. Please hold the camera steady and retake it in focus.",
      meta,
    };
  }

  return { ok: true, meta };
}
