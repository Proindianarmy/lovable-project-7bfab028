// IssueSnap Auth — localStorage-based user store
// Guards added for SSR: typeof window checks prevent server-side crashes

export interface User {
  username: string;
  email: string;
  password: string;
  age: number;
  createdAt: string;
  contributionScore: number;
}

const USERS_KEY = "isssnap_users";
const SESSION_KEY = "isssnap_session";

// ── Safe localStorage helpers (SSR-safe) ─────────────────────────────────────

function isBrowser() {
  return typeof window !== "undefined";
}

function readUsers(): Record<string, User> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUsers(users: Record<string, User>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    console.error("Could not write to localStorage");
  }
}

function readSession(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(email: string | null) {
  if (!isBrowser()) return;
  try {
    if (email) {
      window.localStorage.setItem(SESSION_KEY, email);
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    console.error("Could not write session to localStorage");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllUsers(): Record<string, User> {
  return readUsers();
}

export function getCurrentUser(): User | null {
  const email = readSession();
  if (!email) return null;
  return readUsers()[email.toLowerCase()] ?? null;
}

export type SignupResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export function signup(data: {
  username: string;
  email: string;
  password: string;
  age: number;
}): SignupResult {
  if (!isBrowser()) return { ok: false, error: "Cannot sign up on server." };

  const users = readUsers();
  const key = data.email.toLowerCase().trim();

  if (users[key]) {
    return { ok: false, error: "An account with this email already exists." };
  }
  if (data.username.trim().length < 2) {
    return { ok: false, error: "Username must be at least 2 characters." };
  }
  if (data.age < 13 || data.age > 120) {
    return { ok: false, error: "Please enter a valid age (13–120)." };
  }
  if (data.password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const newUser: User = {
    username: data.username.trim(),
    email: key,
    password: data.password,
    age: data.age,
    createdAt: new Date().toISOString(),
    contributionScore: 0,
  };

  users[key] = newUser;
  writeUsers(users);
  writeSession(key);
  return { ok: true, user: newUser };
}

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: string; userExists: boolean };

export function login(email: string, password: string): LoginResult {
  if (!isBrowser()) return { ok: false, error: "Cannot log in on server.", userExists: false };

  const users = readUsers();
  const key = email.toLowerCase().trim();
  const user = users[key];

  if (!user) {
    return { ok: false, error: "No account found with this email.", userExists: false };
  }
  if (user.password !== password) {
    return { ok: false, error: "Incorrect password.", userExists: true };
  }

  writeSession(key);
  return { ok: true, user };
}

export function logout() {
  writeSession(null);
}