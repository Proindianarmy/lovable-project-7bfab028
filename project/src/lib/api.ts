/* ─────────────────────────────────────────────────────────────────────────────
   IssueSnap API client
   ─────────────────────────────────────────────────────────────────────────── */

// VITE_API_URL should be "/api" (relative) so requests go through the Vite dev
// proxy and never hit CORS. Falls back to "/api" if the env var is missing.
//
// For cross-domain production deploys, set VITE_API_URL=https://your-api.com/api
const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

// Strip trailing slash to prevent double-slash URLs like "/api//auth/login"
const API_BASE = RAW_BASE.replace(/\/$/, "");

function getToken(): string | null {
  return localStorage.getItem("token");
}

// ── Core request helper ───────────────────────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData?: boolean,
): Promise<T> {
  const headers: Record<string, string> = {};

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Do NOT set Content-Type for FormData — the browser sets it with the
  // multipart boundary automatically. Setting it manually breaks file uploads.
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      // credentials: "include" sends cookies — needed if you ever switch to
      // httpOnly cookie sessions. Safe to keep for Bearer-token auth too.
      credentials: "include",
      body: isFormData
        ? (body as FormData)
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  } catch (networkError) {
    // fetch() threw a TypeError — this is a network-level failure.
    // With the Vite proxy in place, this should never happen in dev.
    // If you see this, the backend process is not running.
    const isRelative = url.startsWith("/");
    throw new Error(
      isRelative
        ? `Cannot reach backend at ${url}. Is the backend running on port 5000?\n` +
          `Run: cd backend && npm run dev`
        : `Network error reaching ${url}. Check that the backend is running and accessible.`,
    );
  }

  // Parse JSON regardless of status code so we get the error message from the server
  let data: { success: boolean; message?: string; data?: T };
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${response.status}) from ${url}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data.data as T;
}

// ── Public API surface ────────────────────────────────────────────────────
export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown, isFormData?: boolean) =>
    request<T>("POST", path, body, isFormData),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/* ── Auth ─────────────────────────────────────────────────────────────────── */
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: UserProfile; bonusAwarded: boolean }>("/auth/login", data),

  verifyOtp: (data: { email: string; otp: string }) =>
    api.post<{ token: string; user: UserProfile }>("/auth/verify-otp", data),

  resendOtp: (data: { email: string; purpose: "verify" | "reset" }) =>
    api.post("/auth/resend-otp", data),

  forgotPassword: (data: { email: string }) =>
    api.post("/auth/forgot-password", data),

  verifyResetOtp: (data: { email: string; otp: string }) =>
    api.post("/auth/verify-reset-otp", data),

  resetPassword: (data: { email: string; password: string }) =>
    api.post("/auth/reset-password", data),

  getMe: () => api.get<{ user: UserProfile }>("/auth/me"),
};

/* ── Reports ──────────────────────────────────────────────────────────────── */
export const reportsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<{ reports: Report[]; pagination: Pagination }>(`/reports${q}`);
  },
  get: (id: string) => api.get<{ report: Report }>(`/reports/${id}`),
  create: (formData: FormData) => api.post<{ report: Report }>("/reports", formData, true),
  updateStatus: (id: string, status: string) =>
    api.put<{ report: Report }>(`/reports/${id}/status`, { status }),
  upvote: (id: string) =>
    api.post<{ upvotes: number; downvotes: number }>(`/reports/${id}/upvote`),
  downvote: (id: string) =>
    api.post<{ upvotes: number; downvotes: number }>(`/reports/${id}/downvote`),
  addComment: (id: string, text: string) =>
    api.post(`/reports/${id}/comments`, { text }),
  flagSpam: (id: string) => api.post(`/reports/${id}/flag-spam`),
  /** Server-side AI-generation + civic-issue content check for a single photo. */
  validateImage: (file: Blob, filename = "photo.jpg") => {
    const fd = new FormData();
    fd.append("image", file, filename);
    return api.post<{
      verified: boolean;
      valid?: boolean;
      skipped?: boolean;
      message: string;
      category?: string;
      label?: string;
      confidence?: number;
      details?: Record<string, unknown>;
    }>("/reports/validate-image", fd, true);
  },
};

/* ── Users ────────────────────────────────────────────────────────────────── */
export const usersApi = {
  getMe: () => api.get<{ user: UserProfile }>("/users/me"),
  updateProfile: (data: Partial<UserProfile>) =>
    api.put<{ user: UserProfile }>("/users/me", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/users/change-password", data),
  leaderboard: () =>
    api.get<{ leaderboard: LeaderboardEntry[] }>("/users/leaderboard"),
  setRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }),
  getAll: () => api.get<{ users: UserProfile[] }>("/users/all"),
};

/* ── Notifications ────────────────────────────────────────────────────────── */
export const notificationsApi = {
  list: () =>
    api.get<{ notifications: AppNotification[]; unread: number }>("/notifications"),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
};

/* ── Analytics ────────────────────────────────────────────────────────────── */
export const analyticsApi = {
  get: () => api.get("/analytics"),
};

/* ── Types (mirrors backend models) ─────────────────────────────────────────*/
export interface UserProfile {
  _id: string;
  id?: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  city: string;
  points: number;
  role: "user" | "authority" | "admin";
  notifyEmail: boolean;
  notifyPush: boolean;
  verified: boolean;
  createdAt?: string;
}

export interface Report {
  _id: string;
  id?: string;
  title: string;
  description: string;
  category: string;
  location: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  urgency: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "In Progress" | "Resolved";
  photos?: string[];
  aiTags?: string[];
  aiConfidence?: number;
  reporter: string | UserProfile;
  reporterName: string;
  reporterAvatar?: string;
  upvotes: string[];
  downvotes: string[];
  comments: Comment[];
  spamFlags: string[];
  censored: boolean;
  createdAt: string;
}

export interface Comment {
  _id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  type: "verified" | "upvote" | "resolved" | "comment" | "points" | "system";
  title: string;
  body: string;
  read: boolean;
  reportId?: string;
  createdAt: string;
}

export interface LeaderboardEntry extends UserProfile {
  rank: number;
  reportCount: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
