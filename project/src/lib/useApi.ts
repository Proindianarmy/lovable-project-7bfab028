/**
 * Thin React hooks that wrap the backend API.
 * Routes can call these instead of the local store's context methods.
 */
import { useState, useEffect, useCallback } from "react";
import { reportsApi, notificationsApi, usersApi, analyticsApi } from "./api";
import type { Report, AppNotification, LeaderboardEntry } from "./api";

// Use the same relative base as api.ts — goes through Vite proxy in dev
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "/api").replace(/\/$/, "");

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── Reports ── */
export function useApiReports(params?: Record<string, string>) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportsApi.list(params);
      setReports(data.reports);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { reports, loading, error, refetch: fetch_ };
}

/* ── Single report ── */
export function useApiReport(id: string) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    reportsApi.get(id)
      .then((d) => setReport(d.report))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [id]);

  const refresh = () => {
    reportsApi.get(id).then((d) => setReport(d.report)).catch(() => {});
  };

  return { report, loading, refresh };
}

/* ── Notifications ── */
export function useApiNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    try {
      const data = await notificationsApi.list();
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  return { notifications, unread, loading, markRead, markAllRead, refetch };
}

/* ── Leaderboard ── */
export function useApiLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.leaderboard()
      .then((d) => setLeaderboard(d.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { leaderboard, loading };
}

/* ── Analytics ── */
export function useApiAnalytics() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.get()
      .then((d) => setData(d as Record<string, unknown>))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

/* ── Vote/Comment helpers (direct fetch calls) ── */
export async function apiUpvote(id: string) {
  const res = await fetch(`${API_BASE}/reports/${id}/upvote`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    credentials: "include",
  });
  return res.json();
}

export async function apiDownvote(id: string) {
  const res = await fetch(`${API_BASE}/reports/${id}/downvote`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    credentials: "include",
  });
  return res.json();
}

export async function apiAddComment(id: string, text: string) {
  const res = await fetch(`${API_BASE}/reports/${id}/comments`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text }),
  });
  return res.json();
}

export async function apiUpdateStatus(id: string, status: string) {
  const res = await fetch(`${API_BASE}/reports/${id}/status`, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function apiSetRole(userId: string, role: string) {
  const res = await fetch(`${API_BASE}/users/${userId}/role`, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  return res.json();
}

export async function apiUpdateProfile(patch: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: "PUT",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  return res.json();
}
