import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ClipboardCheck, PieChart, Timer, Inbox } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/authority")({
  head: () => ({ meta: [{ title: "Issue Dashboard — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Authority,
});

function Authority() {
  const queue: any[] = [];
  const workload: any[] = [];

  return (
    <AppShell>
      <div className="-mt-2 mb-6 flex items-center gap-8 border-b border-border overflow-x-auto">
        {["Issue Dashboard", "Verification Queue", "Department Workload", "User Management", "Analytics"].map((t, i) => (
          <button
            key={t}
            className={`pb-3 text-sm font-medium whitespace-nowrap ${
              i === 0 ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <h1 className="text-2xl font-bold mb-6">Issue Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Kpi icon={ClipboardCheck} label="Active Assignments" value="0" />
        <Kpi icon={PieChart}       label="Resolution Rate"    value="0%" />
        <Kpi icon={Timer}          label="Avg. Response Time" value="—" />
      </div>

      <section className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
        <h2 className="font-bold text-lg p-5">Verification Queue</h2>
        {queue.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center text-muted-foreground border-t border-border">
            <Inbox className="w-12 h-12 mb-3 opacity-25" />
            <p className="font-semibold">Verification queue is empty.</p>
            <p className="text-sm mt-1">Submitted reports will appear here for review.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {["Report ID","Type","Location","Submitted By","Date Submitted","Status","Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs">{row.id}</td>
                  <td className="px-5 py-3">{row.type}</td>
                  <td className="px-5 py-3">{row.location}</td>
                  <td className="px-5 py-3">{row.by}</td>
                  <td className="px-5 py-3">{row.date}</td>
                  <td className="px-5 py-3">{row.status}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 rounded-md bg-success/20 text-success text-xs font-semibold">Approve</button>
                      <button className="px-3 py-1 rounded-md bg-destructive/20 text-destructive text-xs font-semibold">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6 bg-card border border-border rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-6">Department Workload</h2>
        {workload.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
            <p className="text-sm">No workload data yet. Charts will populate as issues are assigned to departments.</p>
          </div>
        ) : (
          <div className="flex items-end gap-6 h-56">
            {workload.map((w) => {
              const max = Math.max(...workload.map((x) => x.count));
              return (
                <div key={w.dept} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-sm font-semibold">{w.count}</span>
                  <div className="w-full bg-primary/80 rounded-t" style={{ height: `${(w.count / max) * 100}%` }} />
                  <span className="text-xs text-muted-foreground text-center">{w.dept}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-4xl font-bold mt-2">{value}</p>
      </div>
      <div className="w-14 h-14 grid place-items-center rounded-full bg-muted text-primary">
        <Icon className="w-7 h-7" />
      </div>
    </div>
  );
}
