import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useAuth, useReports } from "@/lib/store";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Analytics,
});

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];

function Analytics() {
  const { user } = useAuth();
  const { reports } = useReports();
  const navigate = useNavigate();

  // Redirect non-admins away
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "authority") {
      toast.error("Access denied. Admins only.");
      navigate({ to: "/feed" });
    }
  }, [user, navigate]);

  if (!user || (user.role !== "admin" && user.role !== "authority")) return null;

  // Category breakdown
  const catMap = new Map<string, number>();
  reports.forEach((r) => catMap.set(r.category, (catMap.get(r.category) ?? 0) + 1));
  const catData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

  // Status breakdown
  const statusMap = new Map<string, number>();
  reports.forEach((r) => statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1));
  const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

  // Reports per day (last 7)
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const count = reports.filter((r) => {
      const rd = new Date(r.createdAt);
      return rd.toDateString() === d.toDateString();
    }).length;
    days.push({ date: label, count });
  }

  const total = reports.length;
  const resolved = reports.filter((r) => r.status === "Resolved").length;
  const pending = reports.filter((r) => r.status === "Pending").length;
  const inProgress = reports.filter((r) => r.status === "In Progress").length;

  return (
    <AppShell title="Analytics Dashboard">
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Reports" value={total} color="text-primary" />
        <Stat label="Resolved" value={resolved} color="text-green-600 dark:text-green-400" />
        <Stat label="In Progress" value={inProgress} color="text-blue-600 dark:text-blue-400" />
        <Stat label="Pending" value={pending} color="text-yellow-600 dark:text-yellow-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Reports This Week">
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

        <ChartCard title="By Category">
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

        <ChartCard title="By Status">
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

        <ChartCard title="Category Volume">
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