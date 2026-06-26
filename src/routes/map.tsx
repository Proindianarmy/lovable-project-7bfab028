import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Droplet, Slash, Shield, MapPin } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "City Issue Map — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: MapPage,
});

function MapPage() {
  const pins: any[] = [];

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

        <div className="absolute top-4 left-4 w-56 bg-card border border-border rounded-2xl p-5 shadow-lg z-10">
          <h2 className="font-bold mb-4">Filter Issues</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><input type="checkbox" defaultChecked /><Droplet className="w-4 h-4" /> Water</li>
            <li className="flex items-center gap-2"><input type="checkbox" defaultChecked /><Slash className="w-4 h-4" /> Roads</li>
            <li className="flex items-center gap-2"><input type="checkbox" defaultChecked /><Shield className="w-4 h-4" /> Safety</li>
          </ul>
          <button className="mt-4 w-full py-2 border border-border rounded-lg text-sm bg-card hover:bg-muted transition-colors">More Filters</button>
          <button className="mt-2 w-full py-2 border border-border rounded-lg text-sm bg-card hover:bg-muted transition-colors">Reset</button>
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border shadow z-10">
          <span className="text-sm font-medium">Heatmap</span>
          <div className="w-10 h-5 bg-muted rounded-full relative">
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-card border border-border rounded-full" />
          </div>
        </div>

        {pins.map((p, i) => (
          <div
            key={i}
            className="absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold border-2 border-card shadow-lg z-10"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.count}
          </div>
        ))}

        {pins.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-8 py-6 text-center shadow-lg max-w-xs">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold text-lg">No issues mapped yet.</p>
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
