import { success, error } from "../utils/response.js";

/**
 * POST /api/reports/validate-image
 *
 * Production-grade server-side image gatekeeper. Runs every photo through
 * Claude's vision model before it is allowed to be attached to a report:
 *
 *   1. AI-generated / synthetic image detection
 *   2. Screenshot / anime / cartoon / game-screenshot / wallpaper rejection
 *   3. Real civic-issue verification (pothole, garbage, broken streetlight,
 *      damaged road, fallen tree, broken drainage, etc.)
 *
 * This runs server-side (not just in the browser) because client-side checks
 * can always be bypassed by a motivated user editing requests directly.
 *
 * Requires ANTHROPIC_API_KEY in backend/.env. If it isn't configured, the
 * endpoint fails "open" with a clear warning so local/dev setups still work,
 * but logs loudly so it's never silently skipped in production.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// NOTE: "claude-sonnet-4-6" was not a real model id and caused every request to
// fail with a 404 from the Anthropic API (so no AI/image checks were actually
// running server-side). We now use the real Claude Sonnet 4.5 vision model,
// which is the latest generally-available Sonnet with strong image reasoning.
const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `You are an image moderation system for a civic-issue reporting app called IssueSnap.
Analyze the photo and respond with ONLY a single JSON object (no markdown, no prose, no code fences) with this exact shape:

{
  "isCivicIssue": boolean,        // true only if the photo shows a real, physical civic/municipal problem
  "issueCategory": string,        // one of: "Roads", "Water", "Electricity", "Sanitation", "Parks", "Safety", "Other", "Unknown"
  "issueLabel": string,           // short human label e.g. "Pothole", "Garbage pile", "Broken streetlight", "Fallen tree", "Damaged drainage"
  "isAIGenerated": boolean,       // true if the image looks AI-generated/synthetic/deepfake/digitally rendered
  "isScreenshot": boolean,        // true if this is a screenshot of a screen, app, or webpage
  "isCartoonOrAnime": boolean,    // true if drawn/animated/anime/cartoon/clipart style
  "isGameScreenshot": boolean,    // true if it's a video game render or game UI
  "isWallpaperOrStock": boolean,  // true if it's generic wallpaper/stock/decorative photography unrelated to any issue
  "isUnrelated": boolean,         // true if it's a real photo but not of any civic issue (selfie, food, pet, random object, etc.)
  "confidence": number,           // 0-100 overall confidence in this assessment
  "reason": string                // one short sentence explaining the verdict, written for an end user
}

Civic issues include: potholes, cracked/damaged roads, garbage/litter/overflowing bins, damaged or non-working streetlights,
broken or open drainage/manholes, water leaks/burst pipes/waterlogging, fallen trees/branches blocking paths, damaged public
property (benches, playgrounds, fences), graffiti, unsafe structures, downed power lines, and similar real-world municipal
problems visible in an actual photograph of the physical world.

Be strict: AI-generated images, screenshots, cartoons/anime, game screenshots, decorative wallpapers/stock photos, and photos
of unrelated real-world things (people, food, pets, selfies, random objects with no visible issue) must all be rejected.`;

function bufferToBase64(buf) {
  return buf.toString("base64");
}

function extToMediaType(mimetype) {
  if (mimetype === "image/jpg") return "image/jpeg";
  return mimetype;
}

export const validateImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, "No image file received.", 400);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn(
        "[validate-image] ANTHROPIC_API_KEY is not set — skipping server-side AI/content " +
          "verification. Set ANTHROPIC_API_KEY in backend/.env before deploying to production.",
      );
      return success(res, {
        verified: false,
        skipped: true,
        message:
          "Server-side image verification is not configured. The photo was accepted based on " +
          "client-side checks only.",
      });
    }

    const base64 = bufferToBase64(req.file.buffer);
    const mediaType = extToMediaType(req.file.mimetype);

    const apiResponse = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: "Classify this photo per your instructions. Respond with the JSON object only.",
              },
            ],
          },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text().catch(() => "");
      console.error("[validate-image] Anthropic API error:", apiResponse.status, errText);
      // Fail closed-but-gentle: let the user retry rather than hard-blocking the whole app.
      return error(res, "Image verification service is temporarily unavailable. Please try again.", 503);
    }

    const data = await apiResponse.json();
    const rawText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let parsed;
    try {
      const cleaned = rawText.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[validate-image] Failed to parse model response:", rawText);
      return error(res, "Could not analyze this image. Please try a different photo.", 422);
    }

    const rejectionReasons = [];
    if (parsed.isAIGenerated) rejectionReasons.push("appears to be AI-generated or synthetic");
    if (parsed.isScreenshot) rejectionReasons.push("looks like a screenshot");
    if (parsed.isCartoonOrAnime) rejectionReasons.push("looks like cartoon/anime artwork");
    if (parsed.isGameScreenshot) rejectionReasons.push("looks like a video game screenshot");
    if (parsed.isWallpaperOrStock) rejectionReasons.push("looks like a generic wallpaper/stock photo");
    if (!parsed.isCivicIssue && parsed.isUnrelated) rejectionReasons.push("does not show a civic issue");

    const rejected = rejectionReasons.length > 0 || !parsed.isCivicIssue;

    if (rejected) {
      // Give the user a specific reason when the photo was rejected — in particular
      // we ALWAYS surface AI-generated rejections explicitly so users know why the
      // photo was blocked.
      let userMessage;
      if (parsed.isAIGenerated) {
        userMessage =
          "This image looks AI-generated or synthetic and can't be used to report a real civic issue. " +
          "Please upload a genuine photo taken from a camera.";
      } else if (rejectionReasons.length > 0) {
        userMessage = `This image ${rejectionReasons.join(", ")}. Please upload a real photo of the civic issue.`;
      } else {
        userMessage =
          "This image does not appear to show a valid civic issue. Please upload a clear photo of the reported problem.";
      }

      return success(res, {
        verified: true,
        valid: false,
        aiGenerated: !!parsed.isAIGenerated,
        message: userMessage,
        details: parsed,
      });
    }

    return success(res, {
      verified: true,
      valid: true,
      message: "Image verified successfully.",
      category: parsed.issueCategory,
      label: parsed.issueLabel,
      confidence: parsed.confidence,
      details: parsed,
    });
  } catch (err) {
    next(err);
  }
};
