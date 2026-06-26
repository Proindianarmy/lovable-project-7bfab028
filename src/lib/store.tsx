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
  image?: string;   // kept for backward compat
  aiTags?: string[];
  aiConfidence?: number;
  reporterId: string;
  reporterName: string;
  reporterAvatar?: string;
  createdAt: number;
  upvotes: string[];    // user ids who upvoted
  downvotes: string[];  // user ids who downvoted
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

export const AVATAR_OPTIONS = [
  "🦊", "🐼", "🐯", "🐸", "🦁", "🐧", "🐵", "🐶",
];

const BANNED_WORDS = [
  "damn", "hell", "crap", "stupid", "idiot", "shit", "fuck", "bitch", "ass",
  "bastard", "dick", "piss",
];

export function censorText(text: string): { text: string; flagged: boolean } {
  let flagged = false;
  const out = text.replace(/\b(\w+)\b/g, (w) => {
    if (BANNED_WORDS.includes(w.toLowerCase())) {
      flagged = true;
      return "*".repeat(w.length);
    }
    return w;
  });
  return { text: out, flagged };
}

export function detectSpam(title: string, description: string): {
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
  const nonsense = words.filter(
    (w) => w.length > 5 && !/[aeiou]/i.test(w),
  ).length;
  if (nonsense >= 2) {
    score += 2;
    reasons.push("Contains nonsense words.");
  }
  if (BANNED_WORDS.some((w) => t.toLowerCase().includes(w))) {
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
 * Simulates AI detection. AI-generated/drawn images have a HIGH confidence flag
 * and the caller is expected to REJECT / delete the image if isAIGenerated=true.
 */
export async function simulateAIDetection(dataUrl?: string): Promise<{
  tags: string[]; confidence: number; category: Category;
  isAIGenerated: boolean; aiGeneratedConfidence: number;
}> {
  const cats = CATEGORIES.filter(c => c !== "Other");
  const category = cats[Math.floor(Math.random() * cats.length)];
  const tags = AI_CATEGORY_TAGS[category].slice(0, 3);
  const confidence = 85;

  if (!dataUrl) return { tags, confidence, category, isAIGenerated: false, aiGeneratedConfidence: 5 };

  try {
    // Convert dataUrl to a Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const form = new FormData();
    form.append("media", blob, "photo.jpg");
    form.append("models", "type");
    form.append("api_user", "736370365");   // ← paste your user number
    form.append("api_secret", "hEnrchrj9wzuKehVjGEQZMgdkw8PgXAc"); // ← paste your secret

    const apiRes = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST", body: form,
    });
    const data = await apiRes.json();
    const aiScore = data?.type?.ai_generated ?? 0;
    const isAIGenerated = aiScore > 0.65;
    return { tags, confidence: 90, category, isAIGenerated, aiGeneratedConfidence: Math.round(aiScore * 100) };
  } catch {
    return { tags, confidence, category, isAIGenerated: false, aiGeneratedConfidence: 5 };
  }
}

const URGENCY_PTS: Record<Urgency, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export function computeRating(r: Report): {
  score: number;
  label: "Critical" | "High" | "Medium" | "Low";
  color: string;
  emoji: string;
} {
  let s = URGENCY_PTS[r.urgency];
  s += Math.min(3, Math.floor(r.upvotes.length / 5));
  if (r.category === "Safety") s += 2;
  if (r.category === "Roads" || r.category === "Water" || r.category === "Electricity") s += 1;
  const ageDays = (Date.now() - r.createdAt) / 86400000;
  if (ageDays > 3 && r.status !== "Resolved") s += 1;
  s = Math.max(1, Math.min(10, s));
  if (s >= 8) return { score: s, label: "Critical", color: "bg-red-500/15 text-red-600 dark:text-red-400", emoji: "🔴" };
  if (s >= 6) return { score: s, label: "High", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400", emoji: "🟠" };
  if (s >= 4) return { score: s, label: "Medium", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400", emoji: "🟡" };
  return { score: s, label: "Low", color: "bg-green-500/15 text-green-700 dark:text-green-400", emoji: "🟢" };
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
  const progress = next
    ? ((points - level.min) / (next.min - level.min)) * 100
    : 100;
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
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
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

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
  );
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
    const accounts: { name: string; email: string; password: string }[] =
      raw ? JSON.parse(raw) : [];
    if (!accounts.find((a) => a.email === ADMIN_EMAIL)) {
      accounts.push({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      localStorage.setItem("accounts", JSON.stringify(accounts));
    }
  } catch { /* ignore */ }
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

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        const profiles = getProfiles();
        profiles[next.email] = next;
        saveProfiles(profiles);
        localStorage.setItem("userName", next.name);
        return next;
      });
    },
    [],
  );

  const addPoints = useCallback(
    (n: number, reason: string) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, points: prev.points + n };
        const profiles = getProfiles();
        profiles[next.email] = next;
        saveProfiles(profiles);
        toast.success(`${n > 0 ? "+" : ""}${n} points — ${reason}`);
        return next;
      });
    },
    [],
  );

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

  return (
    <AuthContext.Provider value={{ user, hydrated, updateProfile, addPoints, setRole, logout }}>
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
  addReport: (r: Omit<Report, "id" | "createdAt" | "upvotes" | "downvotes" | "comments" | "spamFlags" | "status">) => Report;
  upvote: (id: string, userId: string) => { wasUpvoted: boolean; wasDownvoted: boolean };
  downvote: (id: string, userId: string) => { wasUpvoted: boolean; wasDownvoted: boolean };
  flagSpam: (id: string, userId: string) => void;
  setStatus: (id: string, status: IssueStatus) => void;
  addComment: (id: string, userId: string, userName: string, text: string) => void;
  findSimilar: (category: Category, location: string) => Report | undefined;
}
const ReportsContext = createContext<ReportsCtx | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    // Migrate old reports that lack downvotes field
    const raw = load<Report[]>("reports", []);
    const migrated = raw.map((r) => ({
      ...r,
      downvotes: r.downvotes ?? [],
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
          id: "n_seed_1", type: "system", title: "Welcome to IssueSnap",
          body: "Report your first issue to earn 10 points!",
          at: Date.now() - 1000 * 60 * 5, read: false,
        },
        {
          id: "n_seed_2", type: "verified", title: "Sample: Report verified",
          body: "Your sample pothole report was verified by an authority.",
          at: Date.now() - 1000 * 60 * 60, read: false,
        },
        {
          id: "n_seed_3", type: "upvote", title: "Sample: Someone upvoted your report",
          body: "A neighbor supported your issue.",
          at: Date.now() - 1000 * 60 * 60 * 24, read: true,
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
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

export const INDIA_CITIES_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam","Vijayawada","Guntur","Nellore","Kurnool","Rajahmundry","Tirupati","Kakinada","Kadapa","Anantapur"],
  "Arunachal Pradesh": ["Itanagar","Naharlagun","Pasighat","Ziro","Bomdila"],
  "Assam": ["Guwahati","Silchar","Dibrugarh","Jorhat","Nagaon","Tinsukia","Tezpur"],
  "Bihar": ["Patna","Gaya","Muzaffarpur","Bhagalpur","Darbhanga","Purnia","Arrah","Begusarai"],
  "Chhattisgarh": ["Raipur","Bhilai","Bilaspur","Durg","Korba","Rajnandgaon"],
  "Goa": ["Panaji","Margao","Vasco da Gama","Mapusa","Ponda"],
  "Gujarat": ["Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar","Gandhinagar","Anand","Nadiad"],
  "Haryana": ["Faridabad","Gurgaon","Panipat","Ambala","Yamunanagar","Rohtak","Hisar","Karnal","Sonipat"],
  "Himachal Pradesh": ["Shimla","Mandi","Solan","Dharamshala","Baddi","Palampur"],
  "Jharkhand": ["Ranchi","Jamshedpur","Dhanbad","Bokaro","Deoghar","Hazaribagh","Giridih"],
  "Karnataka": ["Bengaluru","Hubli","Mysuru","Mangaluru","Belagavi","Davangere","Ballari","Vijayapura","Shivamogga"],
  "Kerala": ["Thiruvananthapuram","Kochi","Kozhikode","Thrissur","Kollam","Palakkad","Alappuzha","Malappuram"],
  "Madhya Pradesh": ["Bhopal","Indore","Jabalpur","Gwalior","Ujjain","Sagar","Dewas","Satna","Ratlam"],
  "Maharashtra": ["Mumbai","Pune","Nagpur","Thane","Nashik","Aurangabad","Solapur","Navi Mumbai","Kolhapur","Amravati"],
  "Manipur": ["Imphal","Thoubal","Bishnupur","Churachandpur"],
  "Meghalaya": ["Shillong","Tura","Jowai","Nongstoin"],
  "Mizoram": ["Aizawl","Lunglei","Saiha"],
  "Nagaland": ["Kohima","Dimapur","Mokokchung"],
  "Odisha": ["Bhubaneswar","Cuttack","Rourkela","Brahmapur","Sambalpur","Puri","Balasore"],
  "Punjab": ["Ludhiana","Amritsar","Jalandhar","Patiala","Bathinda","Mohali","Hoshiarpur"],
  "Rajasthan": ["Jaipur","Jodhpur","Kota","Bikaner","Ajmer","Udaipur","Bhilwara","Alwar","Sikar"],
  "Sikkim": ["Gangtok","Namchi","Mangan"],
  "Tamil Nadu": ["Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli","Tiruppur","Vellore","Erode"],
  "Telangana": ["Hyderabad","Warangal","Nizamabad","Khammam","Karimnagar","Ramagundam","Mahbubnagar"],
  "Tripura": ["Agartala","Dharmanagar","Udaipur","Kailasahar"],
  "Uttar Pradesh": ["Lucknow","Kanpur","Varanasi","Agra","Meerut","Allahabad","Ghaziabad","Noida","Bareilly","Aligarh","Moradabad","Saharanpur","Gorakhpur","Faizabad"],
  "Uttarakhand": ["Dehradun","Haridwar","Roorkee","Haldwani","Rudrapur","Kashipur","Rishikesh"],
  "West Bengal": ["Kolkata","Asansol","Siliguri","Durgapur","Bardhaman","Malda","Baharampur","Habra"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman","Diu","Silvassa"],
  "Delhi": ["New Delhi","Delhi"],
  "Jammu and Kashmir": ["Srinagar","Jammu","Anantnag","Sopore","Kathua"],
  "Ladakh": ["Leh","Kargil"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry","Karaikal","Mahe","Yanam"],
};

/** Basic Indian pincode validation: 6 digits, first digit 1-9 */
export async function validatePincode(pin: string): Promise<boolean> {
  if (!/^\d{6}$/.test(pin)) return false;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const json = await res.json();
    return json?.[0]?.Status === "Success";
  } catch {
    return false; // network error = don't block the user
  }
}