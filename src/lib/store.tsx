/* eslint-disable react-refresh/only-export-components */
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
  urgency: Urgency;
  status: IssueStatus;
  image?: string;
  aiTags?: string[];
  aiConfidence?: number;
  reporterId: string;
  reporterName: string;
  reporterAvatar?: string;
  createdAt: number;
  upvotes: string[]; // user ids
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
  role: "user" | "authority";
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

export function simulateAIDetection(): Promise<{
  tags: string[];
  confidence: number;
  category: Category;
  isAIGenerated: boolean;
  aiGeneratedConfidence: number;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cats = CATEGORIES.filter((c) => c !== "Other");
      const category = cats[Math.floor(Math.random() * cats.length)];
      const pool = AI_CATEGORY_TAGS[category];
      const tags = [...pool].sort(() => 0.5 - Math.random()).slice(0, 3);
      const confidence = 75 + Math.floor(Math.random() * 22);
      const isAIGenerated = Math.random() < 0.2;
      const aiGeneratedConfidence = isAIGenerated
        ? 70 + Math.floor(Math.random() * 28)
        : 5 + Math.floor(Math.random() * 25);
      resolve({ tags, confidence, category, isAIGenerated, aiGeneratedConfidence });
    }, 2000);
  });
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
  setRole: (role: "user" | "authority") => void;
  logout: () => void;
}
const AuthContext = createContext<AuthCtx | null>(null);

function getProfiles(): Record<string, UserProfile> {
  return load("profiles", {} as Record<string, UserProfile>);
}
function saveProfiles(p: Record<string, UserProfile>) {
  save("profiles", p);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const logged = localStorage.getItem("isLoggedIn") === "true";
    const email = localStorage.getItem("userEmail");
    if (logged && email) {
      const profiles = getProfiles();
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
          role: "user",
          notifyEmail: true,
          notifyPush: true,
        };
        profiles[email] = p;
        saveProfiles(profiles);
      }
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
        toast.success(`+${n} points — ${reason}`);
        return next;
      });
    },
    [],
  );

  const setRole = useCallback(
    (role: "user" | "authority") => {
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
  addReport: (r: Omit<Report, "id" | "createdAt" | "upvotes" | "comments" | "spamFlags" | "status">) => Report;
  upvote: (id: string, userId: string) => void;
  flagSpam: (id: string, userId: string) => void;
  setStatus: (id: string, status: IssueStatus) => void;
  addComment: (id: string, userId: string, userName: string, text: string) => void;
  findSimilar: (category: Category, location: string) => Report | undefined;
}
const ReportsContext = createContext<ReportsCtx | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    setReports(load<Report[]>("reports", []));
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
      comments: [],
      spamFlags: [],
      status: "Pending",
    };
    persist([next, ...load<Report[]>("reports", [])]);
    return next;
  };

  const upvote: ReportsCtx["upvote"] = (id, userId) => {
    const list = load<Report[]>("reports", []);
    const next = list.map((r) => {
      if (r.id !== id) return r;
      if (r.upvotes.includes(userId)) {
        return { ...r, upvotes: r.upvotes.filter((u) => u !== userId) };
      }
      return { ...r, upvotes: [...r.upvotes, userId] };
    });
    persist(next);
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

  const addComment: ReportsCtx["addComment"] = (id, userId, userName, text) => {
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
    () => ({ reports, addReport, upvote, flagSpam, setStatus, addComment, findSimilar }),
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
