import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Map, Eye, EyeOff, UserPlus } from "lucide-react";
import { signup } from "@/lib/auth";

type SearchParams = { email?: string };

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Account — IssueSnap" }] }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  component: SignupPage,
});

function SignupPage() {
  const { email: prefillEmail } = Route.useSearch();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username || !email || !password || !age) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = signup({ username, email, password, age: Number(age) });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Hard navigate — reliable in SSR frameworks
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-2 mb-8 text-xl font-bold text-primary">
        <div className="w-9 h-9 grid place-items-center rounded-lg bg-primary text-primary-foreground">
          <Map className="w-5 h-5" />
        </div>
        IssueSnap
      </Link>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join your community on IssueSnap</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="e.g. citywatch_raj"
              className="auth-input"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              className="auth-input"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Age</label>
            <input
              type="number"
              min={13}
              max={120}
              value={age}
              onChange={(e) => { setAge(e.target.value); setError(""); }}
              placeholder="Your age"
              className="auth-input"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="At least 6 characters"
                className="auth-input pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Confirm password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                placeholder="Re-enter your password"
                className="auth-input pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-medium">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-card px-3">Already have an account?</span>
          </div>
        </div>

        <Link
          to="/login"
          className="block w-full py-3 rounded-lg border border-border text-center text-sm font-medium hover:bg-muted transition-colors"
        >
          Sign in instead
        </Link>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-background);
          font-size: 0.875rem;
          outline: none;
          transition: box-shadow 0.15s;
        }
        .auth-input:focus { box-shadow: 0 0 0 2px var(--color-ring); }
      `}</style>
    </div>
  );
}