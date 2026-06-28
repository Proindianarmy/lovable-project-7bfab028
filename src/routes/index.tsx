import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  TrendingUp,
  Handshake,
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

/* ── India SVG Map ─────────────────────────────────────────────────── */
function IndiaMapSVG() {
  return (
    <svg
      viewBox="0 0 400 460"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-xl"
    >
      {/* Ocean / background */}
      <rect width="400" height="460" fill="transparent" />

      {/* India body — simplified outline path */}
      <path
        d="
          M 140,18 L 165,12 L 192,14 L 220,10 L 248,16 L 272,24
          L 290,36 L 305,52 L 315,70 L 320,90 L 325,112
          L 330,132 L 332,152 L 328,168 L 320,180
          L 330,196 L 336,212 L 332,226 L 320,238
          L 308,250 L 295,264 L 280,278 L 264,292
          L 248,306 L 230,318 L 214,328 L 198,336
          L 184,342 L 172,348 L 160,352 L 150,356
          L 140,352 L 128,344 L 116,332 L 104,318
          L 92,302 L 82,286 L 74,270 L 68,254
          L 64,238 L 62,222 L 60,206 L 60,190
          L 58,174 L 56,158 L 56,142 L 58,126
          L 62,110 L 68,94 L 76,80 L 86,66
          L 98,54 L 112,42 L 128,30 Z
        "
        fill="hsl(var(--primary) / 0.15)"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Sri Lanka */}
      <ellipse
        cx="215"
        cy="390"
        rx="14"
        ry="20"
        fill="hsl(var(--primary) / 0.10)"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />

      {/* Andaman & Nicobar (dots) */}
      <circle
        cx="340"
        cy="200"
        r="5"
        fill="hsl(var(--primary) / 0.20)"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
      />
      <circle
        cx="345"
        cy="220"
        r="4"
        fill="hsl(var(--primary) / 0.20)"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
      />
      <circle
        cx="348"
        cy="240"
        r="3"
        fill="hsl(var(--primary) / 0.15)"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
      />

      {/* State dividers — subtle dashed lines */}
      {[
        "M 190,14 L 194,340",
        "M 130,30 L 290,260",
        "M 68,154 L 330,154",
        "M 70,220 L 332,220",
        "M 80,280 L 295,280",
      ].map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="hsl(var(--primary))"
          strokeWidth="0.4"
          strokeDasharray="6,8"
          opacity="0.25"
        />
      ))}

      {/* City dots */}
      {[
        { x: 162, y: 290, label: "Mumbai" },
        { x: 194, y: 168, label: "Delhi" },
        { x: 228, y: 310, label: "Bengaluru" },
        { x: 240, y: 192, label: "Kolkata" },
        { x: 224, y: 260, label: "Hyderabad" },
        { x: 176, y: 322, label: "Chennai" },
        { x: 162, y: 220, label: "Jaipur" },
      ].map(({ x, y, label }) => (
        <g key={label}>
          <circle cx={x} cy={y} r="4" fill="hsl(var(--primary))" opacity="0.85" />
          <circle cx={x} cy={y} r="7" fill="hsl(var(--primary))" opacity="0.20" />
          <text
            x={x + 9}
            y={y + 4}
            fontSize="9"
            fill="hsl(var(--primary))"
            opacity="0.9"
            fontWeight="600"
          >
            {label}
          </text>
        </g>
      ))}

      {/* IssueSnap ping animation rings on Delhi */}
      <circle
        cx="194"
        cy="168"
        r="12"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        opacity="0.5"
      >
        <animate attributeName="r" values="7;18;7" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
      </circle>

      {/* Label */}
      <text
        x="200"
        y="448"
        textAnchor="middle"
        fontSize="11"
        fill="hsl(var(--muted-foreground))"
        fontWeight="500"
      >
        India
      </text>
    </svg>
  );
}

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
          {/* Logo — India map icon instead of generic Map icon */}
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <div className="w-9 h-9 grid place-items-center rounded-lg bg-primary/10 border border-primary/30 overflow-hidden p-0.5">
              <svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path
                  d="M28,4 L34,2 L42,3 L50,2 L57,4 L63,8 L68,14 L71,22 L72,30 L71,38 L68,44 L71,50 L72,56 L70,62 L66,68 L60,74 L54,80 L48,84 L42,86 L36,84 L30,80 L24,74 L18,68 L14,62 L12,56 L12,50 L12,44 L12,38 L13,30 L15,22 L19,14 L24,8 Z"
                  fill="hsl(var(--primary))"
                  opacity="0.9"
                />
              </svg>
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

        {/* App logo */}
        <div className="relative max-w-xs mx-auto w-full flex items-center justify-center">
          <img
            src="/logo.png"
            alt="IssueSnap"
            className="w-64 h-64 object-contain drop-shadow-2xl"
          />
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

// Remove unused imports warning suppressors
const _TrendingUp = TrendingUp;
const _Handshake = Handshake;
void _TrendingUp;
void _Handshake;
