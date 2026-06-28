import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { censorText, containsBannedWord, BANNED_WORDS } from "./badwords";

/* =========================================================================
 * Types
 * ========================================================================= */

export type Urgency = "Low" | "Medium" | "High" | "Critical";
export type IssueStatus = "Pending" | "In Progress" | "Resolved";
export type Category =
  | "Roads"
  | "Water"
  | "Electricity"
  | "Sanitation"
  | "Parks"
  | "Safety"
  | "Other";

export const CATEGORIES: Category[] = [
  "Roads",
  "Water",
  "Electricity",
  "Sanitation",
  "Parks",
  "Safety",
  "Other",
];

export interface Report {
  id: string;
  title: string;
  description: string;
  category: Category;
  location: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  urgency: Urgency;
  status: IssueStatus;
  photos?: string[]; // up to 5 gallery photos
  image?: string; // kept for backward compat
  aiTags?: string[];
  aiConfidence?: number;
  reporterId: string;
  reporterName: string;
  reporterAvatar?: string;
  createdAt: number;
  upvotes: string[]; // user ids who upvoted
  downvotes: string[]; // user ids who downvoted
  comments: { id: string; userId: string; userName: string; text: string; at: number }[];
  spamFlags: string[];
  censored: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  bio: string;
  city: string;
  points: number;
  role: "user" | "authority" | "admin";
  notifyEmail: boolean;
  notifyPush: boolean;
  lastDailyBonus?: number;
}

export interface Notification {
  id: string;
  type: "verified" | "upvote" | "resolved" | "comment" | "points" | "system";
  title: string;
  body: string;
  at: number;
  read: boolean;
  reportId?: string;
}

/* =========================================================================
 * ADMIN ACCOUNT — permanently baked in
 * ========================================================================= */
export const ADMIN_EMAIL = "admin@issuesnap.com";
export const ADMIN_PASSWORD = "Admin@1234";
export const ADMIN_NAME = "Admin";

/* =========================================================================
 * Utilities — profanity, spam, AI sim, rating, levels
 * ========================================================================= */

export const AVATAR_OPTIONS = ["🦊", "🐼", "🐯", "🐸", "🦁", "🐧", "🐵", "🐶"];

export { censorText, containsBannedWord, BANNED_WORDS };

export function detectSpam(
  title: string,
  description: string,
): {
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;
  const t = `${title} ${description}`;

  if (description.trim().length < 20) {
    score += 3;
    reasons.push("Description is too short (under 20 characters).");
  }
  if (/(.)\1{5,}/.test(t)) {
    score += 3;
    reasons.push("Repeated characters detected.");
  }
  const letters = t.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 20 && letters === letters.toUpperCase()) {
    score += 2;
    reasons.push("Text is entirely uppercase.");
  }
  const words = t.split(/\s+/).filter(Boolean);
  const nonsense = words.filter((w) => w.length > 5 && !/[aeiou]/i.test(w)).length;
  if (nonsense >= 2) {
    score += 2;
    reasons.push("Contains nonsense words.");
  }
  if (containsBannedWord(t)) {
    score += 2;
    reasons.push("Contains profanity.");
  }
  return { score, reasons };
}

const AI_CATEGORY_TAGS: Record<Category, string[]> = {
  Roads: ["Pothole", "Road damage", "Cracked pavement", "Traffic sign"],
  Water: ["Water leak", "Burst pipe", "Drainage", "Standing water"],
  Electricity: ["Street light", "Power line", "Fallen pole", "Electrical hazard"],
  Sanitation: ["Garbage", "Overflowing bin", "Litter", "Waste pileup"],
  Parks: ["Damaged bench", "Broken playground", "Overgrown grass", "Graffiti"],
  Safety: ["Hazard", "Broken fence", "Unsafe structure", "Open manhole"],
  Other: ["Unknown object", "Misc issue"],
};

/**
 * AI / hand-drawn image detection.
 *
 * Strategy: Use Sightengine API (free tier: 500 ops/month) when the key is
 * available, otherwise fall back to an enhanced canvas-based classifier.
 *
 * To enable the real API:
 *   1. Sign up free at https://sightengine.com
 *   2. Add to your .env:  VITE_SIGHTENGINE_USER=xxx  VITE_SIGHTENGINE_SECRET=xxx
 *   3. The detection will automatically use the real API.
 *
 * Without the key the fallback uses an aggressive multi-scale pixel classifier
 * that catches the most obvious cases (solid fills, perfect gradients, cartoons).
 */

/* ═══════════════════════════════════════════════════════════════════════
 * AI / HAND-DRAWN IMAGE DETECTION
 * ═══════════════════════════════════════════════════════════════════════
 *
 * TWO-TIER SYSTEM:
 *
 * Tier 1 (instant, no API): Multi-scale canvas classifier with 12 signals
 *   - Works offline, no key needed
 *   - Catches cartoons, drawings, simple AI art, solid fills, gradients
 *   - AGGRESSIVE thresholds — if borderline, we reject
 *
 * Tier 2 (accurate, free API): Sightengine genai model
 *   - Set VITE_SIGHTENGINE_USER + VITE_SIGHTENGINE_SECRET in .env
 *   - 500 free checks/month, catches modern photorealistic AI images
 *   - Automatically used when keys are present
 * ═══════════════════════════════════════════════════════════════════════ */

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function detectViaSightengine(dataUrl: string): Promise<{ isAI: boolean; score: number }> {
  const user = (import.meta.env?.VITE_SIGHTENGINE_USER ?? "").trim();
  const secret = (import.meta.env?.VITE_SIGHTENGINE_SECRET ?? "").trim();
  if (!user || !secret) throw new Error("no-key");
  const fd = new FormData();
  fd.append("media", dataUrlToBlob(dataUrl), "img.jpg");
  fd.append("models", "genai");
  fd.append("api_user", user);
  fd.append("api_secret", secret);
  const res = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: fd,
  });
  const json = (await res.json()) as { status: string; type?: { ai_generated?: number } };
  if (json.status !== "success") throw new Error("api-err");
  const score = json.type?.ai_generated ?? 0;
  return { isAI: score >= 0.55, score };
}

/* ── Canvas helpers ── */
function getPixels(img: HTMLImageElement, size: number): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size).data;
}

interface CanvasSignals {
  /* colour diversity */
  coarse4bit: number; // unique colours at 4-bit depth (max 4096)
  fine6bit: number; // unique colours at 6-bit depth (max 262144)
  /* transition stats from 128×128 */
  flatRatio: number; // pixel pairs with Δ=0 in ALL 3 channels
  softRatio: number; // pixel pairs with total Δ ≤ 6
  hardRatio: number; // pixel pairs with total Δ > 55
  avgNoise: number; // mean |Δ| per pair
  /* RGB balance */
  rgbBalance: number; // |R-G|+|G-B|+|R-B| (real photos: natural cast)
  /* micro-texture from 32×32 */
  lumVar32: number; // luminance variance — real cameras: >180 always
  /* block uniformity from 256×256 in 8×8 blocks */
  lowVarBlockRatio: number; // fraction of 8×8 blocks with inner-variance < 6
  /* saturation diversity */
  satVar: number; // std-dev of per-pixel saturation
  /* edge continuity — real photos have fractal edges, AI has smooth curves */
  edgeContinuity: number; // ratio of pairs where BOTH horizontal neighbors are also hard
  /* frequency signal — real photos have high-freq noise at 4×4 */
  hiFreqEnergy: number; // mean |Δ| at 4×4 (real photo > 8, AI art < 4)
}

function computeSignals(img: HTMLImageElement): CanvasSignals {
  /* ── 128×128: main stats ── */
  const S1 = 128;
  const d1 = getPixels(img, S1);
  const colSet4 = new Set<number>();
  const colSet6 = new Set<number>();
  let flat = 0,
    soft = 0,
    hard = 0,
    pairs = 0,
    noiseSum = 0;
  let rT = 0,
    gT = 0,
    bT = 0,
    satSum = 0,
    satSqSum = 0,
    pxN = 0;
  const stride1 = S1 * 4;
  let hardPairs = 0,
    bothHard = 0;

  for (let y = 0; y < S1; y++) {
    for (let x = 0; x < S1; x++) {
      const i = (y * S1 + x) * 4;
      const r = d1[i],
        g = d1[i + 1],
        b = d1[i + 2];
      rT += r;
      gT += g;
      bT += b;
      pxN++;
      colSet4.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      colSet6.add(((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2));
      // saturation
      const mx = Math.max(r, g, b),
        mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      satSum += sat;
      satSqSum += sat * sat;

      let isHardH = false;
      if (x < S1 - 1) {
        const j = i + 4;
        const d = Math.abs(r - d1[j]) + Math.abs(g - d1[j + 1]) + Math.abs(b - d1[j + 2]);
        noiseSum += d;
        pairs++;
        if (d === 0) flat++;
        else if (d <= 6) soft++;
        else if (d > 55) {
          hard++;
          isHardH = true;
        }
      }
      if (y < S1 - 1) {
        const j = i + stride1;
        const d = Math.abs(r - d1[j]) + Math.abs(g - d1[j + 1]) + Math.abs(b - d1[j + 2]);
        noiseSum += d;
        pairs++;
        if (d === 0) flat++;
        else if (d <= 6) soft++;
        else if (d > 55) hard++;
      }
      // edge continuity: if this H pair is hard, is the next H pair also hard?
      if (isHardH && x < S1 - 2) {
        hardPairs++;
        const j2 = i + 8;
        const d2 =
          Math.abs(d1[i + 4] - d1[j2]) +
          Math.abs(d1[i + 5] - d1[j2 + 1]) +
          Math.abs(d1[i + 6] - d1[j2 + 2]);
        if (d2 > 55) bothHard++;
      }
    }
  }
  const avgR = rT / pxN,
    avgG = gT / pxN,
    avgB = bT / pxN;
  const satMean = satSum / pxN;
  const satVar = Math.sqrt(Math.max(0, satSqSum / pxN - satMean * satMean));

  /* ── 32×32: luminance variance ── */
  const d2 = getPixels(img, 32);
  let lumS = 0;
  const lums: number[] = [];
  for (let i = 0; i < d2.length; i += 4) {
    const l = 0.299 * d2[i] + 0.587 * d2[i + 1] + 0.114 * d2[i + 2];
    lums.push(l);
    lumS += l;
  }
  const lMean = lumS / lums.length;
  const lumVar32 = lums.reduce((s, v) => s + (v - lMean) ** 2, 0) / lums.length;

  /* ── 256×256: block uniformity ── */
  const S3 = 256,
    BS = 8;
  const d3 = getPixels(img, S3);
  let lowB = 0,
    totB = 0;
  for (let by = 0; by < S3; by += BS) {
    for (let bx = 0; bx < S3; bx += BS) {
      let bs = 0;
      const bl: number[] = [];
      for (let dy = 0; dy < BS; dy++)
        for (let dx = 0; dx < BS; dx++) {
          const i = ((by + dy) * S3 + (bx + dx)) * 4;
          const l = 0.299 * d3[i] + 0.587 * d3[i + 1] + 0.114 * d3[i + 2];
          bl.push(l);
          bs += l;
        }
      const bm = bs / bl.length;
      const bv = bl.reduce((s, v) => s + (v - bm) ** 2, 0) / bl.length;
      if (bv < 6) lowB++;
      totB++;
    }
  }

  /* ── 4×4: high-frequency energy ── */
  const d4 = getPixels(img, 4);
  let hfSum = 0,
    hfN = 0;
  for (let i = 0; i < d4.length - 4; i += 4) {
    hfSum +=
      Math.abs(d4[i] - d4[i + 4]) +
      Math.abs(d4[i + 1] - d4[i + 5]) +
      Math.abs(d4[i + 2] - d4[i + 6]);
    hfN++;
  }

  return {
    coarse4bit: colSet4.size,
    fine6bit: colSet6.size,
    flatRatio: flat / pairs,
    softRatio: soft / pairs,
    hardRatio: hard / pairs,
    avgNoise: noiseSum / pairs,
    rgbBalance: Math.abs(avgR - avgG) + Math.abs(avgG - avgB) + Math.abs(avgR - avgB),
    lumVar32,
    lowVarBlockRatio: lowB / totB,
    satVar,
    edgeContinuity: hardPairs > 0 ? bothHard / hardPairs : 0,
    hiFreqEnergy: hfN > 0 ? hfSum / hfN : 0,
  };
}

function classifyCanvas(sig: CanvasSignals): { isAI: boolean; score: number; reason: string } {
  /* Each signal returns a weight (0 = not fired, positive = fired toward AI/drawn).
     Total weight is normalised to 0–1. Reject if ≥ 0.52 (raised from 0.38 to reduce false positives) */
  const checks: Array<{ w: number; fire: boolean; label: string }> = [
    // Colour diversity — real photos have huge palettes
    { w: 2.0, fire: sig.coarse4bit < 280, label: "low-coarse-colours" },
    { w: 1.5, fire: sig.fine6bit < 700, label: "low-fine-colours" },
    // Smoothness — AI art and drawings are too smooth (tightened thresholds)
    { w: 2.5, fire: sig.flatRatio > 0.08, label: "too-flat" },
    { w: 2.0, fire: sig.softRatio > 0.55, label: "too-smooth" },
    { w: 1.5, fire: sig.softRatio > 0.45 && sig.avgNoise < 14, label: "smooth+low-noise" },
    // Micro-texture — camera sensor always adds grain (lowered threshold)
    { w: 3.0, fire: sig.lumVar32 < 60, label: "no-micro-texture" },
    // Block uniformity — AI art has perfectly uniform fills (tightened)
    { w: 3.5, fire: sig.lowVarBlockRatio > 0.55, label: "too-many-uniform-blocks" },
    // High-freq energy — real photos have JPEG grain at 4×4 scale (lowered threshold)
    { w: 2.5, fire: sig.hiFreqEnergy < 3, label: "no-hf-energy" },
    // RGB balance — AI models output balanced palettes (tightened)
    { w: 1.0, fire: sig.rgbBalance < 6 && sig.avgNoise < 18, label: "balanced-rgb" },
    // Saturation — hand-drawn images have very low or very uniform saturation (tightened)
    { w: 1.0, fire: sig.satVar < 0.025, label: "uniform-saturation" },
    // Edge continuity — drawings have long straight edges (tightened)
    { w: 1.5, fire: sig.edgeContinuity > 0.85 && sig.flatRatio > 0.07, label: "drawing-edges" },
    // Hard outlines + flat fills = hand-drawn (tightened)
    { w: 2.0, fire: sig.hardRatio > 0.15 && sig.flatRatio > 0.1, label: "cartoon-outline" },
  ];

  const total = checks.reduce((s, c) => s + c.w, 0);
  const fired = checks.filter((c) => c.fire);
  const firedW = fired.reduce((s, c) => s + c.w, 0);
  const score = firedW / total;
  const reason = fired.map((c) => c.label).join(", ") || "none";
  return { isAI: score >= 0.52, score, reason }; // raised threshold: 0.38 → 0.52
}

async function detectViaCanvas(dataUrl: string): Promise<{ isAI: boolean; score: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const sig = computeSignals(img);
        const { isAI, score } = classifyCanvas(sig);
        resolve({ isAI, score });
      } catch {
        resolve({ isAI: false, score: 0 });
      }
    };
    img.onerror = () => resolve({ isAI: false, score: 0 });
    img.src = dataUrl;
  });
}

export function simulateAIDetection(dataUrl?: string): Promise<{
  tags: string[];
  confidence: number;
  category: Category;
  isAIGenerated: boolean;
  aiGeneratedConfidence: number;
}> {
  return new Promise((resolve) => {
    const cats = CATEGORIES.filter((c) => c !== "Other");
    const category = cats[Math.floor(Math.random() * cats.length)];
    const tags = [...AI_CATEGORY_TAGS[category]].sort(() => 0.5 - Math.random()).slice(0, 3);
    const confidence = 82 + Math.floor(Math.random() * 14);

    if (!dataUrl) {
      resolve({ tags, confidence, category, isAIGenerated: false, aiGeneratedConfidence: 0 });
      return;
    }

    // Try Sightengine API first, fall back to canvas
    detectViaSightengine(dataUrl)
      .then(({ isAI, score }) => {
        resolve({
          tags,
          confidence,
          category,
          isAIGenerated: isAI,
          aiGeneratedConfidence: Math.round(score * 100),
        });
      })
      .catch(() => {
        detectViaCanvas(dataUrl).then(({ isAI, score }) => {
          const pct = Math.round(Math.min(95, score * 140));
          resolve({ tags, confidence, category, isAIGenerated: isAI, aiGeneratedConfidence: pct });
        });
      });
  });
}

export function computeRating(r: Report): {
  score: number;
  label: "Critical" | "High" | "Medium" | "Low";
  color: string;
  emoji: string;
} {
  let s = { Low: 1, Medium: 3, High: 5, Critical: 7 }[r.urgency];
  s += Math.min(3, Math.floor(r.upvotes.length / 5));
  if (r.category === "Safety") s += 2;
  if (r.category === "Roads" || r.category === "Water" || r.category === "Electricity") s += 1;
  const ageDays = (Date.now() - r.createdAt) / 86400000;
  if (ageDays > 3 && r.status !== "Resolved") s += 1;
  s = Math.max(1, Math.min(10, s));
  if (s >= 8)
    return {
      score: s,
      label: "Critical",
      color: "bg-red-500/15 text-red-600 dark:text-red-400",
      emoji: "🔴",
    };
  if (s >= 6)
    return {
      score: s,
      label: "High",
      color: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
      emoji: "🟠",
    };
  if (s >= 4)
    return {
      score: s,
      label: "Medium",
      color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
      emoji: "🟡",
    };
  return {
    score: s,
    label: "Low",
    color: "bg-green-500/15 text-green-700 dark:text-green-400",
    emoji: "🟢",
  };
}

export const LEVELS = [
  { name: "Newcomer", min: 0, max: 49 },
  { name: "Reporter", min: 50, max: 149 },
  { name: "Investigator", min: 150, max: 399 },
  { name: "Champion", min: 400, max: 999 },
  { name: "Legend", min: 1000, max: Infinity },
];

export function levelFor(points: number) {
  const idx = LEVELS.findIndex((l) => points >= l.min && points <= l.max);
  const level = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const progress = next ? ((points - level.min) / (next.min - level.min)) * 100 : 100;
  return { level, next, progress: Math.max(0, Math.min(100, progress)) };
}

/* =========================================================================
 * Storage helpers
 * ========================================================================= */

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

/* =========================================================================
 * Theme Context
 * ========================================================================= */

type Theme = "light" | "dark";
interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}
const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = stored ?? system;
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme outside ThemeProvider");
  return c;
};

/* =========================================================================
 * Auth + Profile Context
 * ========================================================================= */

interface AuthCtx {
  user: UserProfile | null;
  hydrated: boolean;
  /** Call this after writing isLoggedIn/userEmail to localStorage — updates React state immediately */
  loginUser: (email: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  addPoints: (n: number, reason: string) => void;
  setRole: (role: "user" | "authority" | "admin") => void;
  logout: () => void;
}
const AuthContext = createContext<AuthCtx | null>(null);

function getProfiles(): Record<string, UserProfile> {
  return load("profiles", {} as Record<string, UserProfile>);
}
function saveProfiles(p: Record<string, UserProfile>) {
  save("profiles", p);
}

/** Ensure the hardcoded admin profile always exists */
function ensureAdminProfile(profiles: Record<string, UserProfile>) {
  if (!profiles[ADMIN_EMAIL]) {
    profiles[ADMIN_EMAIL] = {
      id: ADMIN_EMAIL,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      avatar: "🛡️",
      bio: "System administrator",
      city: "",
      points: 9999,
      role: "admin",
      notifyEmail: true,
      notifyPush: true,
    };
  } else {
    // Always enforce admin role for this account
    profiles[ADMIN_EMAIL].role = "admin";
  }
  return profiles;
}

/** Ensure admin account exists in the accounts[] localStorage list */
function ensureAdminAccount() {
  try {
    const raw = localStorage.getItem("accounts");
    const accounts: { name: string; email: string; password: string }[] = raw
      ? JSON.parse(raw)
      : [];
    if (!accounts.find((a) => a.email === ADMIN_EMAIL)) {
      accounts.push({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      localStorage.setItem("accounts", JSON.stringify(accounts));
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    ensureAdminAccount();
    const profiles = getProfiles();
    ensureAdminProfile(profiles);
    saveProfiles(profiles);

    const logged = localStorage.getItem("isLoggedIn") === "true";
    const email = localStorage.getItem("userEmail");
    if (logged && email) {
      let p = profiles[email];
      if (!p) {
        const name = localStorage.getItem("userName") || email.split("@")[0];
        p = {
          id: email,
          email,
          name,
          avatar: AVATAR_OPTIONS[0],
          bio: "",
          city: "",
          points: 0,
          role: email === ADMIN_EMAIL ? "admin" : "user",
          notifyEmail: true,
          notifyPush: true,
        };
        profiles[email] = p;
        saveProfiles(profiles);
      }
      if (email === ADMIN_EMAIL) p.role = "admin";

      // Daily login bonus
      const today = new Date().toDateString();
      const last = p.lastDailyBonus ? new Date(p.lastDailyBonus).toDateString() : null;
      if (last !== today) {
        p.points += 5;
        p.lastDailyBonus = Date.now();
        profiles[email] = p;
        saveProfiles(profiles);
        setTimeout(() => toast.success("+5 points — Daily login bonus!"), 800);
      }
      setUser(p);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: UserProfile) => {
    const profiles = getProfiles();
    profiles[next.email] = next;
    saveProfiles(profiles);
    localStorage.setItem("userName", next.name);
    setUser(next);
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const profiles = getProfiles();
      profiles[next.email] = next;
      saveProfiles(profiles);
      localStorage.setItem("userName", next.name);
      return next;
    });
  }, []);

  const addPoints = useCallback((n: number, reason: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, points: prev.points + n };
      const profiles = getProfiles();
      profiles[next.email] = next;
      saveProfiles(profiles);
      toast.success(`${n > 0 ? "+" : ""}${n} points — ${reason}`);
      return next;
    });
  }, []);

  const setRole = useCallback(
    (role: "user" | "authority" | "admin") => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, role };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    setUser(null);
  }, []);

  // Called from auth page right after writing localStorage — hydrates user state immediately
  const loginUser = useCallback((email: string) => {
    const profiles = getProfiles();
    ensureAdminProfile(profiles);
    let p = profiles[email];
    if (!p) {
      const name = localStorage.getItem("userName") || email.split("@")[0];
      p = {
        id: email,
        email,
        name,
        avatar: AVATAR_OPTIONS[0],
        bio: "",
        city: "",
        points: 0,
        role: email === ADMIN_EMAIL ? "admin" : "user",
        notifyEmail: true,
        notifyPush: true,
      };
    }
    if (email === ADMIN_EMAIL) p.role = "admin";
    // Daily login bonus
    const today = new Date().toDateString();
    const last = p.lastDailyBonus ? new Date(p.lastDailyBonus).toDateString() : null;
    if (last !== today) {
      p.points += 5;
      p.lastDailyBonus = Date.now();
      setTimeout(() => toast.success("+5 points — Daily login bonus!"), 800);
    }
    profiles[email] = p;
    saveProfiles(profiles);
    setUser(p);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, hydrated, loginUser, updateProfile, addPoints, setRole, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};

/* =========================================================================
 * Reports Context
 * ========================================================================= */

interface ReportsCtx {
  reports: Report[];
  addReport: (
    r: Omit<
      Report,
      "id" | "createdAt" | "upvotes" | "downvotes" | "comments" | "spamFlags" | "status"
    >,
  ) => Report;
  upvote: (id: string, userId: string) => { wasUpvoted: boolean; wasDownvoted: boolean };
  downvote: (id: string, userId: string) => { wasUpvoted: boolean; wasDownvoted: boolean };
  flagSpam: (id: string, userId: string) => void;
  setStatus: (id: string, status: IssueStatus) => void;
  addComment: (id: string, userId: string, userName: string, text: string) => void;
  findSimilar: (category: Category, location: string) => Report | undefined;
}
const ReportsContext = createContext<ReportsCtx | null>(null);

/** Strip base64 data-URIs and other garbage that may have been
 *  accidentally saved into text fields from old buggy reports. */
function sanitiseText(text: string | undefined | null): string {
  if (!text) return "";
  // If entire field is a data URI → replace with empty
  if (/^data:[a-z]+\/[a-z+]+;base64,/i.test(text.trim())) return "";
  // If the field contains an embedded data URI anywhere, cut it off there
  const idx = text.indexOf("data:image/");
  if (idx !== -1) {
    const before = text.slice(0, idx).trim();
    return before || "";
  }
  return text;
}

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    // Migrate and sanitise reports from localStorage
    const raw = load<Report[]>("reports", []);
    const migrated = raw.map((r) => ({
      ...r,
      downvotes: r.downvotes ?? [],
      // Strip any accidentally stored base64/data-URI blobs from text fields
      description: sanitiseText(r.description),
      location: sanitiseText(r.location),
      title: sanitiseText(r.title),
    }));
    setReports(migrated);
  }, []);

  const persist = (next: Report[]) => {
    setReports(next);
    save("reports", next);
  };

  const addReport: ReportsCtx["addReport"] = (r) => {
    const next: Report = {
      ...r,
      id: `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      upvotes: [],
      downvotes: [],
      comments: [],
      spamFlags: [],
      status: "Pending",
    };
    persist([next, ...load<Report[]>("reports", [])]);
    return next;
  };

  /**
   * Upvote a report. Returns previous state so caller can award/revoke XP.
   * - If already upvoted → remove upvote (toggle off)
   * - If downvoted → remove downvote and add upvote
   * - Otherwise → add upvote
   */
  const upvote: ReportsCtx["upvote"] = (id, userId) => {
    const list = load<Report[]>("reports", []);
    let wasUpvoted = false;
    let wasDownvoted = false;
    const next = list.map((r) => {
      if (r.id !== id) return r;
      const dv = r.downvotes ?? [];
      wasUpvoted = r.upvotes.includes(userId);
      wasDownvoted = dv.includes(userId);
      if (wasUpvoted) {
        // toggle off
        return { ...r, upvotes: r.upvotes.filter((u) => u !== userId), downvotes: dv };
      }
      return {
        ...r,
        upvotes: [...r.upvotes, userId],
        downvotes: dv.filter((u) => u !== userId),
      };
    });
    persist(next);
    return { wasUpvoted, wasDownvoted };
  };

  /**
   * Downvote a report.
   * - If already downvoted → toggle off
   * - If upvoted → remove upvote and add downvote
   * - Otherwise → add downvote
   */
  const downvote: ReportsCtx["downvote"] = (id, userId) => {
    const list = load<Report[]>("reports", []);
    let wasUpvoted = false;
    let wasDownvoted = false;
    const next = list.map((r) => {
      if (r.id !== id) return r;
      const dv = r.downvotes ?? [];
      wasUpvoted = r.upvotes.includes(userId);
      wasDownvoted = dv.includes(userId);
      if (wasDownvoted) {
        // toggle off
        return { ...r, upvotes: r.upvotes, downvotes: dv.filter((u) => u !== userId) };
      }
      return {
        ...r,
        upvotes: r.upvotes.filter((u) => u !== userId),
        downvotes: [...dv, userId],
      };
    });
    persist(next);
    return { wasUpvoted, wasDownvoted };
  };

  const flagSpam: ReportsCtx["flagSpam"] = (id, userId) => {
    const list = load<Report[]>("reports", []);
    const next = list.map((r) =>
      r.id === id && !r.spamFlags.includes(userId)
        ? { ...r, spamFlags: [...r.spamFlags, userId] }
        : r,
    );
    persist(next);
  };

  const setStatus: ReportsCtx["setStatus"] = (id, status) => {
    const list = load<Report[]>("reports", []);
    persist(list.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const addComment: ReportsCtx["addComment"] = (id, userId, userName, rawText) => {
    // Auto-censor curse words before saving
    const { text } = censorText(rawText);
    const list = load<Report[]>("reports", []);
    const next = list.map((r) =>
      r.id === id
        ? {
            ...r,
            comments: [
              ...r.comments,
              { id: `c_${Date.now()}`, userId, userName, text, at: Date.now() },
            ],
          }
        : r,
    );
    persist(next);
  };

  const findSimilar: ReportsCtx["findSimilar"] = (category, location) => {
    const list = load<Report[]>("reports", []);
    const loc = location.trim().toLowerCase();
    if (!loc) return undefined;
    return list.find(
      (r) =>
        r.category === category &&
        r.status !== "Resolved" &&
        (r.location.toLowerCase().includes(loc) || loc.includes(r.location.toLowerCase())),
    );
  };

  const value = useMemo(
    () => ({ reports, addReport, upvote, downvote, flagSpam, setStatus, addComment, findSimilar }),
    [reports],
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}
export const useReports = () => {
  const c = useContext(ReportsContext);
  if (!c) throw new Error("useReports outside ReportsProvider");
  return c;
};

/* =========================================================================
 * Notifications Context
 * ========================================================================= */

interface NotifCtx {
  notifications: Notification[];
  unread: number;
  push: (n: Omit<Notification, "id" | "at" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}
const NotifContext = createContext<NotifCtx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const existing = load<Notification[]>("notifications", []);
    if (existing.length === 0) {
      const seed: Notification[] = [
        {
          id: "n_seed_1",
          type: "system",
          title: "Welcome to IssueSnap",
          body: "Report your first issue to earn 10 points!",
          at: Date.now() - 1000 * 60 * 5,
          read: false,
        },
        {
          id: "n_seed_2",
          type: "verified",
          title: "Sample: Report verified",
          body: "Your sample pothole report was verified by an authority.",
          at: Date.now() - 1000 * 60 * 60,
          read: false,
        },
        {
          id: "n_seed_3",
          type: "upvote",
          title: "Sample: Someone upvoted your report",
          body: "A neighbor supported your issue.",
          at: Date.now() - 1000 * 60 * 60 * 24,
          read: true,
        },
      ];
      save("notifications", seed);
      setNotifications(seed);
    } else {
      setNotifications(existing);
    }
  }, []);

  const persist = (next: Notification[]) => {
    setNotifications(next);
    save("notifications", next);
  };

  const push: NotifCtx["push"] = (n) => {
    const next: Notification = {
      ...n,
      id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      at: Date.now(),
      read: false,
    };
    persist([next, ...load<Notification[]>("notifications", [])]);
  };

  const markRead: NotifCtx["markRead"] = (id) => {
    persist(
      load<Notification[]>("notifications", []).map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    );
  };

  const markAllRead: NotifCtx["markAllRead"] = () => {
    persist(load<Notification[]>("notifications", []).map((n) => ({ ...n, read: true })));
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <NotifContext.Provider value={{ notifications, unread, push, markRead, markAllRead }}>
      {children}
    </NotifContext.Provider>
  );
}
export const useNotifications = () => {
  const c = useContext(NotifContext);
  if (!c) throw new Error("useNotifications outside NotificationsProvider");
  return c;
};

/* =========================================================================
 * Combined Providers
 * ========================================================================= */

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReportsProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </ReportsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/* =========================================================================
 * Time helpers
 * ========================================================================= */

export function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* =========================================================================
 * India geographic data
 * ========================================================================= */

export const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const INDIA_CITIES_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "Nellore",
    "Kurnool",
    "Rajahmundry",
    "Tirupati",
    "Kakinada",
    "Kadapa",
    "Anantapur",
  ],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Ziro", "Bomdila"],
  Assam: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia", "Arrah", "Begusarai"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Durg", "Korba", "Rajnandgaon"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  Gujarat: [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Bhavnagar",
    "Jamnagar",
    "Gandhinagar",
    "Anand",
    "Nadiad",
  ],
  Haryana: [
    "Faridabad",
    "Gurgaon",
    "Panipat",
    "Ambala",
    "Yamunanagar",
    "Rohtak",
    "Hisar",
    "Karnal",
    "Sonipat",
  ],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Dharamshala", "Baddi", "Palampur"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih"],
  Karnataka: [
    "Bengaluru",
    "Hubli",
    "Mysuru",
    "Mangaluru",
    "Belagavi",
    "Davangere",
    "Ballari",
    "Vijayapura",
    "Shivamogga",
  ],
  Kerala: [
    "Thiruvananthapuram",
    "Kochi",
    "Kozhikode",
    "Thrissur",
    "Kollam",
    "Palakkad",
    "Alappuzha",
    "Malappuram",
  ],
  "Madhya Pradesh": [
    "Bhopal",
    "Indore",
    "Jabalpur",
    "Gwalior",
    "Ujjain",
    "Sagar",
    "Dewas",
    "Satna",
    "Ratlam",
  ],
  Maharashtra: [
    "Mumbai",
    "Pune",
    "Nagpur",
    "Thane",
    "Nashik",
    "Aurangabad",
    "Solapur",
    "Navi Mumbai",
    "Kolhapur",
    "Amravati",
  ],
  Manipur: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
  Meghalaya: ["Shillong", "Tura", "Jowai", "Nongstoin"],
  Mizoram: ["Aizawl", "Lunglei", "Saiha"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Brahmapur", "Sambalpur", "Puri", "Balasore"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Hoshiarpur"],
  Rajasthan: [
    "Jaipur",
    "Jodhpur",
    "Kota",
    "Bikaner",
    "Ajmer",
    "Udaipur",
    "Bhilwara",
    "Alwar",
    "Sikar",
  ],
  Sikkim: ["Gangtok", "Namchi", "Mangan"],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Salem",
    "Tirunelveli",
    "Tiruppur",
    "Vellore",
    "Erode",
  ],
  Telangana: [
    "Hyderabad",
    "Warangal",
    "Nizamabad",
    "Khammam",
    "Karimnagar",
    "Ramagundam",
    "Mahbubnagar",
  ],
  Tripura: ["Agartala", "Dharmanagar", "Udaipur", "Kailasahar"],
  "Uttar Pradesh": [
    "Lucknow",
    "Kanpur",
    "Varanasi",
    "Agra",
    "Meerut",
    "Allahabad",
    "Ghaziabad",
    "Noida",
    "Bareilly",
    "Aligarh",
    "Moradabad",
    "Saharanpur",
    "Gorakhpur",
    "Faizabad",
  ],
  Uttarakhand: ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh"],
  "West Bengal": [
    "Kolkata",
    "Asansol",
    "Siliguri",
    "Durgapur",
    "Bardhaman",
    "Malda",
    "Baharampur",
    "Habra",
  ],
  "Andaman and Nicobar Islands": ["Port Blair"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Delhi: ["New Delhi", "Delhi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Sopore", "Kathua"],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

/**
 * Real Indian pincode validation against known postal circle ranges.
 * Ref: India Post pincode directory
 */
export function validatePincode(pin: string): boolean {
  const p = pin.trim();
  if (!/^[1-9][0-9]{5}$/.test(p)) return false;
  const num = parseInt(p, 10);
  const validRanges: [number, number][] = [
    [110001, 110097],
    [121001, 136136],
    [140001, 160062],
    [171001, 177220],
    [180001, 194401],
    [201001, 285223],
    [302001, 344704],
    [360001, 396450],
    [400001, 416528],
    [403001, 403731],
    [411001, 445402],
    [440001, 445402],
    [450001, 497778],
    [500001, 535546],
    [560001, 591317],
    [600001, 643253],
    [670001, 695618],
    [700001, 743713],
    [751001, 770073],
    [781001, 799299],
    [800001, 855117],
    [828001, 835229],
  ];
  return validRanges.some(([lo, hi]) => num >= lo && num <= hi);
}
