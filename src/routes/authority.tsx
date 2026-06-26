import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useAuth, useReports, useNotifications, type IssueStatus, timeAgo } from "@/lib/store";
import { Shield, ShieldCheck, BarChart3, Cog, Inbox, CheckCircle2, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const AUTHORITY_PASS = "admin2026";

export const Route = createFileRoute("/authority")({
  head: () => ({ meta: [{ title: "Authority Dashboard — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Authority,
});

type Tab = "overview" | "pending" | "resolved" | "settings";

function Authority() {
  const { user, setRole, addPoints } = useAuth();
  const { reports, setStatus } = useReports();
  const { push } = useNotifications();
  const [tab, setTab] = useState<Tab>("overview");

  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Admin always gets access automatically
      if (user?.role === "admin") { setUnlocked(true); return; }
      if (sessionStorage.getItem("authorityUnlocked") === "1") setUnlocked(true);
    }
  }, [user]);

  if (!user) return null;

  const tryUnlock = () => {
    if (pass === AUTHORITY_PASS) {
      sessionStorage.setItem("authorityUnlocked", "1");
      setUnlocked(true);
      setError("");
      if (user.role !== "authority" && user.role !== "admin") setRole("authority");
      toast.success("Authority access granted!");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  if (!unlocked) {
    return (
      <AppShell title="Authority Dashboard">
        <div className="bg-card border border-border rounded-2xl p-10 max-w-md mx-auto mt-10 shadow-sm">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 grid place-items-center mb-3">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-1">Authority Access</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the authority password to continue.
            </p>
          </div>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              placeholder="Password"
              className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={tryUnlock}
            className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            Unlock
          </button>
        </div>
      </AppShell>
    );
  }

  const pending = reports.filter((r) => r.status !== "Resolved");
  const resolved = reports.filter((r) => r.status === "Resolved");
  const week = reports.filter((r) => r.status === "Resolved" && r.createdAt >= Date.now() - 7 * 86400000);

  const changeStatus = (id: string, status: IssueStatus) => {
    setStatus(id, status);
    const report = reports.find((r) => r.id === id);
    if (status === "In Progress") {
      push({ type: "verified", title: "Your report was verified", body: `"${report?.title}" is now in progress.`, reportId: id });
      if (report?.reporterId === user.id) addPoints(25, "Report verified");
    } else if (status === "Resolved") {
      push({ type: "resolved", title: "Your issue was resolved", body: `"${report?.title}" has been marked resolved.`, reportId: id });
      if (report?.reporterId === user.id) addPoints(50, "Report resolved");
    }
    toast.success(`Status updated to ${status}`);
  };

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "pending", label: `Pending (${pending.length})`, icon: Inbox },
    { id: "resolved", label: `Resolved (${resolved.length})`, icon: CheckCircle2 },
    { id: "settings", label: "Settings", icon: Cog },
  ];

  return (
    <AppShell title="Authority Dashboard">
      <div className="flex flex-wrap gap-2 mb-6 bg-card border border-border rounded-xl p-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Total Reports" value={reports.length} />
          <Stat label="Pending" value={pending.length} />
          <Stat label="Resolved this week" value={week.length} />
        </div>
      )}

      {tab === "pending" && (
        <ReportList reports={pending} actions={(r) => (
          <select
            value={r.status}
            onChange={(e) => changeStatus(r.id, e.target.value as IssueStatus)}
            className="h-9 px-2 rounded-md border border-border bg-background text-sm"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        )} />
      )}

      {tab === "resolved" && (
        <ReportList reports={resolved} actions={(r) => (
          <StatusBadge status={r.status} />
        )} />
      )}

      {tab === "settings" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-md">
          <div>
            <p className="font-semibold mb-1">Authority role</p>
            <p className="text-sm text-muted-foreground mb-3">You currently have authority privileges.</p>
            {user.role !== "admin" && (
              <button
                onClick={() => { setRole("user"); toast.success("Reverted to regular user"); }}
                className="px-4 py-2 rounded-md border border-border text-sm"
              >
                Revoke authority role
              </button>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function ReportList({
  reports, actions,
}: {
  reports: import("@/lib/store").Report[];
  actions: (r: import("@/lib/store").Report) => React.ReactNode;
}) {
  if (reports.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
        Nothing here yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{r.title}</p>
            <p className="text-xs text-muted-foreground">
              {r.category} · {r.location} · {timeAgo(r.createdAt)}
            </p>
          </div>
          {actions(r)}
        </div>
      ))}
    </div>
  );
}
export { ShieldCheck, X };