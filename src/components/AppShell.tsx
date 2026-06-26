import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, ListChecks, Map, Bell, Trophy, Settings, Search, BarChart3, Shield, LogOut, User } from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { getCurrentUser, logout, type User as AuthUser } from "@/lib/auth";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/report", label: "Report Issue", icon: PlusCircle },
  { to: "/feed", label: "Issue Feed", icon: ListChecks },
  { to: "/map", label: "Map", icon: Map },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/authority", label: "Authority", icon: Shield },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Read current user on mount and whenever the component re-renders
  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  // Close menu on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleLogout() {
    logout();
    setUser(null);
    setMenuOpen(false);
    navigate({ to: "/login" });
  }

  // Initials from username
  const initials = user
    ? user.username.slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <Link to="/" className="flex items-center gap-2 px-6 py-5 text-xl font-bold tracking-tight">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Map className="w-5 h-5" />
          </div>
          IssueSnap
        </Link>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar user footer */}
        {user && (
          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center text-sm font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-sidebar-foreground truncate">{user.username}</div>
                <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center gap-4 px-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search for issues, locations..."
              className="w-full h-10 pl-9 pr-4 rounded-full bg-muted text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-muted">
              <Bell className="w-5 h-5" />
            </button>

            {user ? (
              /* Logged-in user avatar + dropdown */
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
                    {initials}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{user.username}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-sm font-semibold">{user.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <User className="w-4 h-4" /> Profile & Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in */
              <Link
                to="/login"
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8">
          {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  );
}

// Canonical lifecycle: Pending → Assigned → In Progress → Resolved
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-warning/25 text-warning-foreground",
    Assigned: "bg-info/20 text-info-foreground",
    "In Progress": "bg-blue-500/20 text-blue-700",
    Resolved: "bg-success/20 text-success",
  };
  return (
    <span className={`badge-pill ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    High: "bg-destructive/15 text-destructive",
    Medium: "bg-warning/25 text-warning-foreground",
    Low: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`badge-pill ${map[severity] ?? "bg-muted text-muted-foreground"}`}>
      {severity} Severity
    </span>
  );
}
