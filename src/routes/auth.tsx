import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  MapPin,
  AlertTriangle,
  Mail,
  KeyRound,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — IssueSnap" }] }),
  component: AuthPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Mode = "signin" | "signup" | "otp-verify" | "forgot" | "reset-otp" | "reset-password";
type Account = { name: string; email: string; password: string; verified: boolean };

function getAccounts(): Account[] {
  try {
    return JSON.parse(localStorage.getItem("accounts") || "[]");
  } catch {
    return [];
  }
}
function saveAccounts(a: Account[]) {
  localStorage.setItem("accounts", JSON.stringify(a));
}

/* ── OTP helpers (stored in sessionStorage so they expire on tab close) ── */
function storeOtp(email: string, otp: string) {
  sessionStorage.setItem(`otp_${email}`, JSON.stringify({ otp, exp: Date.now() + 10 * 60 * 1000 }));
}
function verifyOtp(email: string, entered: string): "ok" | "wrong" | "expired" {
  try {
    const raw = sessionStorage.getItem(`otp_${email}`);
    if (!raw) return "expired";
    const { otp, exp } = JSON.parse(raw) as { otp: string; exp: number };
    if (Date.now() > exp) return "expired";
    return otp === entered.trim() ? "ok" : "wrong";
  } catch {
    return "expired";
  }
}
function clearOtp(email: string) {
  sessionStorage.removeItem(`otp_${email}`);
}

/* ── Email sending via EmailJS (free) — see setup guide ── */
async function sendOtpEmail(
  toEmail: string,
  otp: string,
  purpose: "verify" | "reset",
): Promise<void> {
  const serviceId = import.meta.env?.VITE_EMAILJS_SERVICE_ID ?? "";
  const templateId =
    purpose === "verify"
      ? (import.meta.env?.VITE_EMAILJS_VERIFY_TEMPLATE ?? "")
      : (import.meta.env?.VITE_EMAILJS_RESET_TEMPLATE ?? "");
  const publicKey = import.meta.env?.VITE_EMAILJS_PUBLIC_KEY ?? "";

  if (!serviceId || !templateId || !publicKey) {
    // Dev fallback: print OTP to console so you can still test locally
    console.info(`[IssueSnap DEV] OTP for ${toEmail}: ${otp}`);
    return;
  }

  // Send all common variable name aliases so the template works regardless
  // of what you named the variables inside your EmailJS template editor.
  const body = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: publicKey,
    template_params: {
      to_email: toEmail,
      email: toEmail,
      otp_code: otp,
      otp: otp,
      passcode: otp,
      expires_in: "10 minutes",
    },
  };

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    console.error("[EmailJS error]", res.status, errText);
    throw new Error(`email-failed: ${res.status} ${errText}`);
  }
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ── OTP Input Component ── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const ref4 = useRef<HTMLInputElement>(null);
  const ref5 = useRef<HTMLInputElement>(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const next = digits.slice();
      next[i] = " ";
      onChange(next.join("").trimEnd());
      if (i > 0) refs[i - 1].current?.focus();
    } else if (/^\d$/.test(e.key)) {
      const next = digits.slice();
      next[i] = e.key;
      onChange(next.join("").replace(/ /g, ""));
      if (i < 5) refs[i + 1].current?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center my-4">
      {refs.map((ref, i) => (
        <input
          key={i}
          ref={ref}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === " " ? "" : digits[i]}
          onKeyDown={(e) => handleKey(i, e)}
          onChange={() => {}} // controlled via keydown
          className="w-11 h-12 text-center text-xl font-bold rounded-lg border-2 border-border bg-background focus:border-primary focus:outline-none"
        />
      ))}
    </div>
  );
}

/* ── OTP Countdown ── */
function OtpTimer({ seconds, onExpired }: { seconds: number; onExpired: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      onExpired();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onExpired]);
  const m = Math.floor(left / 60),
    s = left % 60;
  return (
    <span
      className={`text-sm font-mono ${left < 60 ? "text-destructive" : "text-muted-foreground"}`}
    >
      {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  const redirected =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("blocked") === "1";

  const doLogin = (email: string, userName: string) => {
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userName", userName);
    navigate({ to: "/dashboard" });
  };

  /* ── Send OTP ── */
  const sendOtp = async (targetEmail: string, purpose: "verify" | "reset") => {
    setOtpSending(true);
    const code = generateOtp();
    storeOtp(targetEmail, code);
    try {
      await sendOtpEmail(targetEmail, code, purpose);
      setOtpSent(true);
      setOtpExpired(false);
      setOtp("");
    } catch {
      setErrors({ general: "Failed to send OTP. Please try again." });
    }
    setOtpSending(false);
  };

  /* ── Sign Up → send verify OTP ── */
  const handleSignUp = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Name must be at least 2 characters";
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address";
    if (password.length < 6) next.password = "Password must be at least 6 characters";
    if (password !== confirm) next.confirm = "Passwords do not match";
    if (email === ADMIN_EMAIL) next.email = "This email is reserved.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const accounts = getAccounts();
    if (accounts.find((a) => a.email === email)) {
      setErrors({ email: "Account already exists. Sign in instead." });
      return;
    }
    // Save unverified account
    accounts.push({ name: name.trim(), email, password, verified: false });
    saveAccounts(accounts);
    setErrors({});
    sendOtp(email, "verify");
    setMode("otp-verify");
  };

  /* ── Verify OTP (signup) ── */
  const handleVerifyOtp = () => {
    const result = verifyOtp(email, otp);
    if (result === "expired") {
      setErrors({ otp: "OTP has expired. Request a new one." });
      return;
    }
    if (result === "wrong") {
      setErrors({ otp: "Incorrect OTP. Please try again." });
      return;
    }
    clearOtp(email);
    // Mark account verified
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.email === email);
    if (idx >= 0) accounts[idx].verified = true;
    saveAccounts(accounts);
    setErrors({});
    doLogin(email, name.trim());
  };

  /* ── Sign In ── */
  const handleSignIn = () => {
    const next: Record<string, string> = {};
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address";
    if (!password) next.password = "Enter your password";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    // Admin hardcoded
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      doLogin(email, ADMIN_NAME);
      return;
    }
    const match = getAccounts().find((a) => a.email === email && a.password === password);
    if (!match) {
      setErrors({ general: "No account found. Check credentials or create an account." });
      return;
    }
    doLogin(email, match.name);
  };

  /* ── Forgot password → send reset OTP ── */
  const handleForgotSubmit = () => {
    if (!EMAIL_RE.test(email)) {
      setErrors({ email: "Enter a valid email address" });
      return;
    }
    const exists = getAccounts().find((a) => a.email === email) || email === ADMIN_EMAIL;
    if (!exists) {
      setErrors({ email: "No account found with this email." });
      return;
    }
    setErrors({});
    sendOtp(email, "reset");
    setMode("reset-otp");
  };

  /* ── Verify reset OTP ── */
  const handleResetOtp = () => {
    const result = verifyOtp(email, otp);
    if (result === "expired") {
      setErrors({ otp: "OTP has expired. Request a new one." });
      return;
    }
    if (result === "wrong") {
      setErrors({ otp: "Incorrect OTP. Please try again." });
      return;
    }
    clearOtp(email);
    setErrors({});
    setMode("reset-password");
  };

  /* ── Set new password ── */
  const handleResetPassword = () => {
    if (newPass.length < 6) {
      setErrors({ newPass: "Min 6 characters" });
      return;
    }
    if (newPass !== confirmNew) {
      setErrors({ confirmNew: "Passwords do not match" });
      return;
    }
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.email === email);
    if (idx >= 0) {
      accounts[idx].password = newPass;
      saveAccounts(accounts);
    }
    setSuccess("Password reset successfully! You can now sign in.");
    setMode("signin");
  };

  const goBack = () => {
    setMode("signin");
    setErrors({});
    setOtp("");
    setOtpSent(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <div className="w-10 h-10 overflow-hidden rounded-xl">
              <img src="/logo.png" alt="IssueSnap Logo" className="w-full h-full object-contain" />
            </div>
            IssueSnap
          </Link>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            {/* ── Success banner ── */}
            {success && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {redirected && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>You must be signed in to access that page.</span>
              </div>
            )}

            {errors.general && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* ════════════ SIGN IN ════════════ */}
            {mode === "signin" && (
              <>
                <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Sign in to continue reporting and tracking issues.
                </p>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 mb-6">
                  <button className="py-2 text-sm rounded-md font-medium bg-background shadow-sm">
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMode("signup");
                      setErrors({});
                    }}
                    className="py-2 text-sm rounded-md font-medium text-muted-foreground"
                  >
                    Create Account
                  </button>
                </div>
                <div className="space-y-4">
                  <Field label="Email" error={errors.email}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="inp"
                    />
                  </Field>
                  <Field label="Password" error={errors.password}>
                    <PwInput
                      value={password}
                      onChange={setPassword}
                      show={showPw}
                      onToggle={() => setShowPw((v) => !v)}
                    />
                  </Field>
                  <button
                    onClick={handleSignIn}
                    className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMode("forgot");
                      setErrors({});
                    }}
                    className="w-full text-xs text-primary hover:underline mt-1"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {/* ════════════ SIGN UP ════════════ */}
            {mode === "signup" && (
              <>
                <h1 className="text-2xl font-bold mb-1">Create your account</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Join IssueSnap to help improve your community.
                </p>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 mb-6">
                  <button
                    onClick={() => {
                      setMode("signin");
                      setErrors({});
                    }}
                    className="py-2 text-sm rounded-md font-medium text-muted-foreground"
                  >
                    Sign In
                  </button>
                  <button className="py-2 text-sm rounded-md font-medium bg-background shadow-sm">
                    Create Account
                  </button>
                </div>
                <div className="space-y-4">
                  <Field label="Full Name" error={errors.name}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="inp"
                    />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="inp"
                    />
                  </Field>
                  <Field label="Password" error={errors.password}>
                    <PwInput
                      value={password}
                      onChange={setPassword}
                      show={showPw}
                      onToggle={() => setShowPw((v) => !v)}
                    />
                  </Field>
                  <Field label="Confirm Password" error={errors.confirm}>
                    <input
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="inp"
                    />
                  </Field>
                  <button
                    onClick={handleSignUp}
                    disabled={otpSending}
                    className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60"
                  >
                    {otpSending ? "Sending OTP…" : "Create Account"}
                  </button>
                </div>
              </>
            )}

            {/* ════════════ OTP VERIFY (signup) ════════════ */}
            {mode === "otp-verify" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 grid place-items-center">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">Verify your email</h1>
                    <p className="text-xs text-muted-foreground">
                      OTP sent to <b>{email}</b>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Enter the 6-digit code from your email. Expires in:
                </p>
                {!otpExpired && <OtpTimer seconds={600} onExpired={() => setOtpExpired(true)} />}
                {otpExpired && <p className="text-sm text-destructive mb-2">OTP expired.</p>}
                <OtpInput value={otp} onChange={setOtp} />
                {errors.otp && <p className="text-xs text-destructive mb-2">{errors.otp}</p>}
                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.length < 6}
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Verify & Continue
                </button>
                <button
                  onClick={() => sendOtp(email, "verify")}
                  disabled={otpSending || !otpExpired}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-primary hover:underline disabled:opacity-40"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                </button>
                <button
                  onClick={goBack}
                  className="w-full mt-2 text-xs text-muted-foreground hover:underline"
                >
                  ← Back to Sign In
                </button>
              </>
            )}

            {/* ════════════ FORGOT PASSWORD ════════════ */}
            {mode === "forgot" && (
              <>
                <h1 className="text-2xl font-bold mb-1">Reset Password</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Enter your email to receive a reset OTP.
                </p>
                <div className="space-y-4">
                  <Field label="Email" error={errors.email}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="inp"
                    />
                  </Field>
                  <button
                    onClick={handleForgotSubmit}
                    disabled={otpSending}
                    className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60"
                  >
                    {otpSending ? "Sending OTP…" : "Send Reset OTP"}
                  </button>
                  <button
                    onClick={goBack}
                    className="w-full text-xs text-muted-foreground hover:underline"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </>
            )}

            {/* ════════════ RESET OTP ════════════ */}
            {mode === "reset-otp" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 grid place-items-center">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">Enter Reset OTP</h1>
                    <p className="text-xs text-muted-foreground">
                      Sent to <b>{email}</b>
                    </p>
                  </div>
                </div>
                {!otpExpired && <OtpTimer seconds={600} onExpired={() => setOtpExpired(true)} />}
                {otpExpired && <p className="text-sm text-destructive mb-2">OTP expired.</p>}
                <OtpInput value={otp} onChange={setOtp} />
                {errors.otp && <p className="text-xs text-destructive mb-2">{errors.otp}</p>}
                <button
                  onClick={handleResetOtp}
                  disabled={otp.length < 6}
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                >
                  Verify OTP
                </button>
                <button
                  onClick={() => sendOtp(email, "reset")}
                  disabled={otpSending || !otpExpired}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-primary hover:underline disabled:opacity-40"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                </button>
              </>
            )}

            {/* ════════════ NEW PASSWORD ════════════ */}
            {mode === "reset-password" && (
              <>
                <h1 className="text-2xl font-bold mb-1">Set New Password</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose a new password for <b>{email}</b>
                </p>
                <div className="space-y-4">
                  <Field label="New Password" error={errors.newPass}>
                    <PwInput
                      value={newPass}
                      onChange={setNewPass}
                      show={showPw}
                      onToggle={() => setShowPw((v) => !v)}
                    />
                  </Field>
                  <Field label="Confirm New Password" error={errors.confirmNew}>
                    <input
                      type={showPw ? "text" : "password"}
                      value={confirmNew}
                      onChange={(e) => setConfirmNew(e.target.value)}
                      placeholder="••••••••"
                      className="inp"
                    />
                  </Field>
                  <button
                    onClick={handleResetPassword}
                    className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
                  >
                    Reset Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <style>{`.inp { width:100%; height:2.5rem; padding: 0 0.875rem; border-radius:0.5rem; border:1px solid var(--color-border); background:var(--color-background); color:var(--color-foreground); font-size:0.875rem; outline:none; } .inp:focus { box-shadow:0 0 0 2px var(--color-ring); }`}</style>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PwInput({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="inp pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}