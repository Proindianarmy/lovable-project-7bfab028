import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Calendar, Filter } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Civic Analytics — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Analytics,
});

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const zero12 = Array(12).fill(0);

const categories = [
  { label: "Infrastructure",    color: "oklch(0.45 0.12 250)" },
  { label: "Environment",       color: "oklch(0.55 0.10 200)" },
  { label: "Safety",            color: "oklch(0.70 0.10 180)" },
  { label: "Public Services",   color: "oklch(0.78 0.12 150)" },
  { label: "Other",             color: "oklch(0.80 0.15 60)"  },
];

function Analytics() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold">Civic Analytics &amp; City Health</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-card text-sm">
            <Calendar className="w-4 h-4" /> Last 30 Days
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-card text-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold mb-6">City Health Score</h2>
          <div className="relative w-64 h-32 mx-auto">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
              <path d="M10,100 A90,90 0 0,1 10,100" fill="none" stroke="oklch(0.65 0.17 150)" strokeWidth="14" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
              <div>
                <span className="text-5xl font-bold">0</span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <p className="text-sm text-muted-foreground">No data yet.</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center border-t border-border pt-5">
            <Stat label="Open Issues" value="0" />
            <Stat label="Resolved (Last 30 Days)" value="0" />
            <Stat label="Avg. Resolution Time" value="—" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4">Issue Reporting Trends (Last 12 Months)</h2>
            <ZeroLineChart />
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <Legend color="oklch(0.45 0.12 250)" label="New Reports" />
              <Legend color="oklch(0.65 0.17 150)" label="Resolved" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4">Issue Category Distribution</h2>
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 120 120" className="w-32 h-32 flex-shrink-0">
                <circle cx="60" cy="60" r="46" fill="none" stroke="hsl(var(--muted))" strokeWidth="18" />
              </svg>
              <ul className="text-sm space-y-1.5">
                {categories.map((c) => (
                  <li key={c.label} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                    {c.label} (0%)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
        <h2 className="font-bold p-5">Department Performance</h2>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {["Department","Total Issues","Resolved","Avg. Resolution Time","Performance Score"].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                No department data available yet. Data will populate as issues are assigned and resolved.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function ZeroLineChart() {
  const W = 400, H = 160, P = 24;
  const max = 100;
  const flat = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"} ${P + (i * (W - P * 2)) / 11} ${H - P - (v / max) * (H - P * 2)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
      {[0, 20, 40, 60, 80, 100].map((y) => (
        <g key={y}>
          <line x1={P} x2={W - P} y1={H - P - (y / max) * (H - P * 2)} y2={H - P - (y / max) * (H - P * 2)} stroke="oklch(0.92 0.012 250)" />
          <text x={2} y={H - P - (y / max) * (H - P * 2) + 3} fontSize="8" fill="oklch(0.55 0.03 250)">{y}</text>
        </g>
      ))}
      <path d={flat(zero12)} fill="none" stroke="oklch(0.45 0.12 250)" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
      <path d={flat(zero12)} fill="none" stroke="oklch(0.65 0.17 150)" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
      {months.map((m, i) => (
        <text key={m} x={P + (i * (W - P * 2)) / 11} y={H - 6} fontSize="8" textAnchor="middle" fill="oklch(0.55 0.03 250)">{m}</text>
      ))}
    </svg>
  );
}
