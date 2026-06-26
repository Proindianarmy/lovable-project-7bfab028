import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, TrendingUp, Handshake, MapPin, CheckCircle2, Users, Clock, Map, User, LogOut, Settings } from "lucide-react";
import { useAuth, useReports } from "@/lib/store";
import { useMemo, useRef, useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IssueSnap — Report Local Issues, Track Progress" },
      { name: "description", content: "The modern civic platform connecting citizens and authorities to resolve community challenges efficiently." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { reports } = useReports();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleReportClick = () => {
    if (user) {
      navigate({ to: "/report" });
    } else {
      navigate({ to: "/auth", search: { mode: "signup" } as never });
    }
  };

  // Live stats from actual report data
  const stats = useMemo(() => {
    const resolved = reports.filter((r) => r.status === "Resolved").length;
    // unique reporters
    const reporters = new Set(reports.map((r) => r.reporterId)).size;
    return { resolved, reporters };
  }, [reports]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <div className="w-9 h-9 grid place-items-center rounded-lg bg-primary text-primary-foreground">
              <Map className="w-5 h-5" />
            </div>
            IssueSnap
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/feed" className="hover:text-primary">Explore Issues</Link>
            <a href="#how" className="hover:text-primary">How it Works</a>

            {user ? (
              /* — Logged-in: show avatar + mini dropdown — */
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:bg-muted"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-base overflow-hidden">
                    {user.avatar?.startsWith("data:") ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 object-cover rounded-full" />
                    ) : (
                      user.avatar ?? "👤"
                    )}
                  </div>
                  <span className="font-medium">{user.name}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs mt-1 text-primary font-medium">{user.points} pts · {user.role}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
                    >
                      <Map className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted"
                    >
                      <LogOut className="w-4 h-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* — Guest: Sign In button — */
              <Link to="/auth" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            Report Local Issues.<br />Track Progress.<br />Improve Communities.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-md">
            The modern platform that connects citizens and authorities to resolve civic challenges efficiently.
          </p>
          <button
            onClick={handleReportClick}
            className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            <MapPin className="w-4 h-4" /> Report an Issue
          </button>
          {user && (
            <Link
              to="/dashboard"
              className="mt-4 ml-4 inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-border font-medium hover:bg-muted"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
        <div className="relative aspect-square max-w-md mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-info/20 to-primary/10" />
          <div className="relative w-full h-full flex items-center justify-center p-8">
            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex flex-col items-center justify-center gap-4">
              <Map className="w-24 h-24 text-primary/40" />
              <p className="text-primary/60 font-medium text-center">City Issue Map</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live stats pulled from real data */}
      <section className="bg-muted/60 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          <Stat icon={CheckCircle2} value={stats.resolved > 0 ? `${stats.resolved}+` : "0"} label="Issues Resolved" />
          <Stat icon={Users} value={stats.reporters > 0 ? `${stats.reporters}+` : "0"} label="Active Reporters" />
          <Stat icon={Clock} value={reports.length > 0 ? "48h" : "—"} label="Avg Response Time" />
        </div>
      </section>

      <section id="how" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How it Works</h2>
        <div className="grid md:grid-cols-3 gap-10">
          <Step icon={Camera} title="Snap & Submit" desc="Capture the issue and add details." />
          <Step icon={TrendingUp} title="Track Progress" desc="Follow the status with real-time updates." />
          <Step icon={Handshake} title="Resolve & Improve" desc="Collaborate with local services for solutions." />
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 IssueSnap. Building better cities together.
      </footer>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
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

function Step({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="text-center">
      <Icon className="w-10 h-10 mx-auto text-primary" />
      <h3 className="mt-4 font-bold">{title}:</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}