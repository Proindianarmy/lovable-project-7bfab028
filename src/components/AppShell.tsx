import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, PlusCircle, ListChecks, Map, Bell, Trophy, Settings,
  BarChart3, Shield, Sun, Moon, LogOut, User, Check,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth, useNotifications, useTheme, timeAgo } from "@/lib/store";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="w-9 h-9 grid place-items-center rounded-full hover:bg-muted text-foreground transition-colors"
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

function NotifBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-muted text-foreground"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Notifications</span>
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.at)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const display = user?.name ?? "Guest";
  const avatar = user?.avatar ?? "?";

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-1.5 py-1 rounded-full hover:bg-muted"
        >
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-lg overflow-hidden">
            {avatar.startsWith("data:") ? (
              <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              avatar
            )}
          </div>
          <span className="text-sm font-medium hidden sm:block text-foreground">{display}</span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg z-50">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-semibold text-sm truncate">{display}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? "—"}</p>
              {user && (
                <p className="text-xs mt-1">
                  <span className="font-medium text-primary">{user.points}</span>{" "}
                  <span className="text-muted-foreground">points · {user.role}</span>
                </p>
              )}
            </div>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
            >
              <User className="w-4 h-4" /> Profile & Settings
            </Link>
            <button
              onClick={() => { setOpen(false); setConfirm(true); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted"
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        )}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of IssueSnap?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen bg-muted/30">
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center gap-4 px-6">
          <div className="flex-1" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <NotifBell />
            <UserMenu />
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

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    "In Progress": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    Resolved: "bg-green-500/15 text-green-700 dark:text-green-400",
    Assigned: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  };
  return (
    <span className={`badge-pill ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: "bg-red-500/15 text-red-600 dark:text-red-400",
    High: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    Medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
    Low: "bg-green-500/15 text-green-700 dark:text-green-400",
  };
  return (
    <span className={`badge-pill ${map[severity] ?? "bg-muted text-muted-foreground"}`}>
      {severity}
    </span>
  );
}

export { Check }; // re-export helper for child files if needed
