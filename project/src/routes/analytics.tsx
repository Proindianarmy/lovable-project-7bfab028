import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useAuth, useReports } from "@/lib/store";
import { useApiAnalytics, useApiReports } from "@/lib/useApi";
import { useT } from "@/lib/i18n";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Analytics,
});

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];

function Analytics() {
  const t = useT();
  const { user } = useAuth();
  const { reports: storeReports } = useReports();
  const { reports: apiReports } = useApiReports();
  const { data: apiAnalytics } = useApiAnalytics();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "authority") {
      toast.error("Access denied. Admins only.");
      navigate({ to: "/feed" });
    }
  }, [user, navigate]);

  if (!user || (user.role !== "admin" && user.role !== "authority")) return null;

  // Use API analytics if available, else derive from local store
  const reports = apiReports.length > 0 ? apiReports : storeReports;

  let catData: { name: string; value: number }[];
  let statusData: { name: string; value: number }[];
  let days: { date: string; count: number }[];
  let total: number, resolved: number, pending: number, inProgress: number;

  if (apiAnalytics) {
    const a = apiAnalytics as {
      totalReports: number;
      byCategory: {_id: string; count: number}[];
      byStatus: {_id: string; count: number}[];
      trend: {_id: string; count: number}[];
    };
    total = a.totalReports || 0;
    catData = (a.byCategory || []).map((x) => ({ name: x._id, value: x.count }));
    statusData = (a.byStatus || []).map((x) => ({ name: x._id, value: x.count }));
    resolved = (a.byStatus || []).find((x) => x._id === "Resolved")?.count ?? 0;
    pending = (a.byStatus || []).find((x) => x._id === "Pending")?.count ?? 0;
    inProgress = (a.byStatus || []).find((x) => x._id === "In Progress")?.count ?? 0;
    // Build last-7-days from trend
    days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const count = (a.trend || []).find((t) => t._id === key)?.count ?? 0;
      days.push({ date: label, count });
    }
  } else {
    const catMap = new Map<string, number>();
    reports.forEach((r) => catMap.set(r.category, (catMap.get(r.category) ?? 0) + 1));
    catData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
    const statusMap = new Map<string, number>();
    reports.forEach((r) => statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1));
    statusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
    days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const count = reports.filter((r) => {
        const rd = new Date(typeof r.createdAt === "number" ? r.createdAt : r.createdAt);
        return rd.toDateString() === d.toDateString();
      }).length;
      days.push({ date: label, count });
    }
    total = reports.length;
    resolved = reports.filter((r) => r.status === "Resolved").length;
    pending = reports.filter((r) => r.status === "Pending").length;
    inProgress = reports.filter((r) => r.status === "In Progress").length;
  }

  return (
    <AppShell title={t("analyticsTitle")}>
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Stat label={t("totalReports")} value={total} color="text-primary" />
        <Stat label={t("resolvedReports")} value={resolved} color="text-green-600 dark:text-green-400" />
        <Stat label={t("inProgressReports")} value={inProgress} color="text-blue-600 dark:text-blue-400" />
        <Stat label={t("pendingReports")} value={pending} color="text-yellow-600 dark:text-yellow-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title={t("reportsThisWeek")}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("byCategory")}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {catData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("byStatus")}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("categoryVolume")}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" allowDecimals={false} className="text-xs" />
              <YAxis type="category" dataKey="name" width={80} className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
