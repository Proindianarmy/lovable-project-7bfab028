import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MapPin } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useReports, CATEGORIES, type Category, timeAgo } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "City Issue Map — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: MapPage,
});

function locationToXY(loc: string): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < loc.length; i++) h = (h * 31 + loc.charCodeAt(i)) & 0xffffffff;
  const x = 10 + (Math.abs(h % 1000) / 1000) * 80;
  const h2 = (h * 1000003) & 0xffffffff;
  const y = 10 + (Math.abs(h2 % 1000) / 1000) * 75;
  return { x, y };
}

function urgencyColor(u: string) {
  if (u === "Critical" || u === "High") return "bg-red-500";
  if (u === "Medium") return "bg-yellow-500";
  return "bg-green-500";
}

function urgencyBadge(u: string) {
  if (u === "Critical" || u === "High") return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (u === "Medium") return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
  return "bg-green-500/15 text-green-700 dark:text-green-400";
}

function MapPage() {
  const { reports } = useReports();
  const [active, setActive] = useState<Set<Category>>(new Set(CATEGORIES));

  const toggle = (c: Category) => {
    setActive((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  };
  const reset = () => setActive(new Set(CATEGORIES));

  const visible = reports.filter((r) => active.has(r.category));

  return (
    <AppShell>
      <div className="relative h-[calc(100vh-10rem)] rounded-2xl overflow-hidden border border-border">
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundColor: "#e8eaed",
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute top-4 left-4 w-60 bg-card border border-border rounded-2xl p-5 shadow-lg z-20">
          <h2 className="font-bold mb-3">Filter Issues</h2>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={active.has(c)}
                  onChange={() => toggle(c)}
                  id={`cat-${c}`}
                />
                <label htmlFor={`cat-${c}`} className="cursor-pointer">{c}</label>
              </li>
            ))}
          </ul>
          <button
            onClick={reset}
            className="mt-3 w-full py-2 border border-border rounded-lg text-sm bg-card hover:bg-muted transition-colors"
          >
            Reset
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {visible.length} of {reports.length}
          </p>
        </div>

        {visible.map((r) => {
          const { x, y } = locationToXY(r.location || r.id);
          return (
            <div
              key={r.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className={`w-9 h-9 grid place-items-center rounded-full ${urgencyColor(r.urgency)} text-white border-2 border-card shadow-lg cursor-pointer transition-transform group-hover:scale-110`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-popover text-popover-foreground border border-border rounded-xl p-3 shadow-xl z-30">
                <p className="font-semibold text-sm truncate">{r.title}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="badge-pill bg-muted text-muted-foreground">{r.category}</span>
                  <span className={`badge-pill ${urgencyBadge(r.urgency)}`}>{r.urgency}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">By {r.reporterName}</p>
                <p className="text-xs text-muted-foreground truncate">{r.location}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(r.createdAt)}</p>
              </div>
            </div>
          );
        })}

        {reports.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-8 py-6 text-center shadow-lg max-w-xs">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold text-lg">No issues reported yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Reported issues will appear as pins on this map once submitted.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
