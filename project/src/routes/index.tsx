import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  MapPin,
  CheckCircle2,
  Users,
  Clock,
  LogOut,
  Settings,
  Globe,
} from "lucide-react";
import { useAuth, useReports } from "@/lib/store";
import { useMemo, useRef, useState, useContext } from "react";
import { LangContext } from "@/lib/LangContext";
import { useT, LANGUAGES } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IssueSnap — Report Local Issues, Track Progress" },
      {
        name: "description",
        content: "The modern civic platform connecting citizens and authorities.",
      },
    ],
  }),
  component: Landing,
});

/* ── Language Switcher ──────────────────────────────────────────────── */
function LangSwitcher() {
  const { lang, setLang } = useContext(LangContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border hover:bg-muted text-sm font-medium"
      >
        <Globe className="w-4 h-4" />
        {LANGUAGES.find((l) => l.code === lang)?.nativeLabel}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-xl border border-border bg-popover shadow-lg z-50 overflow-hidden">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center justify-between ${lang === l.code ? "text-primary font-semibold" : ""}`}
            >
              <span>{l.nativeLabel}</span>
              {lang === l.code && <span className="text-primary">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { reports } = useReports();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const handleReportClick = () => {
    if (user) navigate({ to: "/report" });
    else navigate({ to: "/auth", search: { mode: "signup" } as never });
  };

  const stats = useMemo(() => {
    const resolved = reports.filter((r) => r.status === "Resolved").length;
    const reporters = new Set(reports.map((r) => r.reporterId)).size;
    return { resolved, reporters };
  }, [reports]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/90 backdrop-blur z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <div className="w-9 h-9 overflow-hidden">
              <img src="/logo.png" alt="IssueSnap Logo" className="w-full h-full object-contain" />
            </div>
            IssueSnap
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/feed" className="hover:text-primary">
              {t("exploreIssues")}
            </Link>
            <a href="#how" className="hover:text-primary">
              {t("howItWorks")}
            </a>
            <LangSwitcher />

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:bg-muted"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-base overflow-hidden">
                    {user.avatar?.startsWith("data:") ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 object-cover rounded-full" />
                    ) : (
                      (user.avatar ?? "👤")
                    )}
                  </div>
                  <span className="font-medium">{user.name}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs mt-1 text-primary font-medium">
                          {user.points} pts · {user.role}
                        </p>
                      </div>
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="w-6 h-6 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
                      >
                        ✕
                      </button>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
                    >
                      <MapPin className="w-4 h-4" /> {t("dashboard")}
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
                    >
                      <Settings className="w-4 h-4" /> {t("settings")}
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted"
                    >
                      <LogOut className="w-4 h-4" /> {t("logOut")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
              >
                {t("signIn")}
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight whitespace-pre-line">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-md">{t("heroSubtitle")}</p>
          <button
            onClick={handleReportClick}
            className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            <MapPin className="w-4 h-4" /> {t("reportAnIssue")}
          </button>
          {user && (
            <Link
              to="/dashboard"
              className="mt-4 ml-4 inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-border font-medium hover:bg-muted"
            >
              {t("goToDashboard")}
            </Link>
          )}
        </div>

        {/* App Logo Display */}
        <div className="relative max-w-sm mx-auto w-full flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5" />
          <div className="relative p-6 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="IssueSnap"
              className="w-full max-w-[320px] object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-muted/60 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          <Stat
            icon={CheckCircle2}
            value={stats.resolved > 0 ? `${stats.resolved}+` : "0"}
            label={t("issuesResolved")}
          />
          <Stat
            icon={Users}
            value={stats.reporters > 0 ? `${stats.reporters}+` : "0"}
            label={t("activeReporters")}
          />
          <Stat
            icon={Clock}
            value={reports.length > 0 ? "48h" : "—"}
            label={t("avgResponseTime")}
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">{t("howItWorks")}</h2>
        <div className="grid md:grid-cols-3 gap-10">
          <Step icon="📸" title={t("snapSubmit")} desc={t("snapSubmitDesc")} />
          <Step icon="📊" title={t("trackProgress")} desc={t("trackProgressDesc")} />
          <Step icon="🤝" title={t("resolveImprove")} desc={t("resolveImproveDesc")} />
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 IssueSnap. Building better cities together.
      </footer>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 justify-center py-4">
      <div className="w-12 h-12 grid place-items-center rounded-full bg-background border border-border text-primary">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function Step({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}



