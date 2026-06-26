import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useReports, CATEGORIES } from "@/lib/store";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";
import { Download } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Analytics,
});

const PIE_COLORS = ["#eab308", "#3b82f6", "#10b981"];

function Analytics() {
  const { reports } = useReports();
  const [days, setDays] = useState(30);

  const filtered = useMemo(
    () => reports.filter((r) => r.createdAt >= Date.now() - days * 86400000),
    [reports, days],
  );

  const byCategory = useMemo(
    () => CATEGORIES.map((c) => ({ name: c, count: filtered.filter((r) => r.category === c).length })),
    [filtered],
  );

  const byStatus = useMemo(() => {
    const statuses = ["Pending", "In Progress", "Resolved"] as const;
    return statuses.map((s) => ({ name: s, value: filtered.filter((r) => r.status === s).length }));
  }, [filtered]);

  const overTime = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const k = `${d.getMonth() + 1}/${d.getDate()}`;
      buckets[k] = 0;
    }
    filtered.forEach((r) => {
      const d = new Date(r.createdAt);
      const k = `${d.getMonth() + 1}/${d.getDate()}`;
      if (k in buckets) buckets[k] += 1;
    });
    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  }, [filtered, days]);

  const totalCount = filtered.length;
  const resolvedCount = filtered.filter((r) => r.status === "Resolved").length;
  const resolvedPct = totalCount ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const areaCounts: Record<string, number> = {};
  filtered.forEach((r) => { areaCounts[r.location] = (areaCounts[r.location] || 0) + 1; });
  const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const avgResolutionHrs = (() => {
    const done = filtered.filter((r) => r.status === "Resolved");
    if (done.length === 0) return 0;
    const avgMs = done.reduce((a, r) => a + (Date.now() - r.createdAt), 0) / done.length;
    return Math.round(avgMs / 3600000);
  })();

  const exportCsv = () => {
    const header = ["id", "title", "category", "status", "urgency", "location", "upvotes", "createdAt"];
    const rows = filtered.map((r) => [
      r.id, JSON.stringify(r.title), r.category, r.status, r.urgency,
      JSON.stringify(r.location), r.upvotes.length, new Date(r.createdAt).toISOString(),
    ].join(","));
    const blob = new Blob([header.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "issuesnap-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Analytics">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-sm text-muted-foreground">Date range:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-md text-sm ${days === d ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            Last {d} days
          </button>
        ))}
        <button onClick={exportCsv} className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Total Reports" value={totalCount.toString()} />
        <Stat label="Resolved %" value={`${resolvedPct}%`} />
        <Stat label="Avg Resolution" value={`${avgResolutionHrs}h`} />
        <Stat label="Top Area" value={topArea} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Reports by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }} />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Status Breakdown">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title={`Reports Submitted (last ${days} days)`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={overTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)" }} />
              <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1 truncate">{value}</div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 ${className}`}>
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}
