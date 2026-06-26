import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Map, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — IssueSnap" }] }),
  component: AuthPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Account = { name: string; email: string; password: string };

function getAccounts(): Account[] {
  try {
    return JSON.parse(localStorage.getItem("accounts") || "[]");
  } catch {
    return [];
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
    general?: string;
  }>({});

  const redirected =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("blocked") === "1";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};

    if (mode === "signup") {
      if (name.trim().length < 2) next.name = "Name must be at least 2 characters";
      if (!EMAIL_RE.test(email)) next.email = "Please enter a valid email address";
      if (password.length < 6) next.password = "Password must be at least 6 characters";
      if (password !== confirm) next.confirm = "Passwords do not match";
      setErrors(next);
      if (Object.keys(next).length > 0) return;

      const accounts = getAccounts();
      if (accounts.find((a) => a.email === email)) {
        setErrors({ email: "An account with this email already exists. Please sign in." });
        return;
      }
      accounts.push({ name: name.trim(), email, password });
      localStorage.setItem("accounts", JSON.stringify(accounts));
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", name.trim());
      navigate({ to: "/dashboard" });
    } else {
      if (!EMAIL_RE.test(email)) next.email = "Please enter a valid email address";
      if (!password) next.password = "Please enter your password";
      setErrors(next);
      if (Object.keys(next).length > 0) return;

      const accounts = getAccounts();
      const match = accounts.find((a) => a.email === email && a.password === password);
      if (!match) {
        setErrors({
          general:
            "No account found with these credentials. Please create an account first.",
        });
        return;
      }
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", match.name);
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <div className="w-9 h-9 grid place-items-center rounded-lg bg-primary text-primary-foreground">
              <Map className="w-5 h-5" />
            </div>
            IssueSnap
          </Link>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-bold mb-1">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signin"
                ? "Sign in to continue reporting and tracking issues."
                : "Join IssueSnap to start improving your community."}
            </p>

            {redirected && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>You must be signed in to access that page. Please sign in or create an account first.</span>
              </div>
            )}

            {errors.general && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 mb-6">
              <button
                type="button"
                onClick={() => { setMode("signin"); setErrors({}); }}
                className={`py-2 text-sm rounded-md font-medium transition ${
                  mode === "signin" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setErrors({}); }}
                className={`py-2 text-sm rounded-md font-medium transition ${
                  mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-invalid={!!errors.confirm}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>}
                </div>
              )}

              <button
                type="submit"
                className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {mode === "signin" && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErrors({}); }}
                  className="text-primary font-medium hover:underline"
                >
                  Create one first
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
