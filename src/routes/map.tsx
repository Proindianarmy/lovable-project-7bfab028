import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MapPin } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useReports, CATEGORIES, type Category, timeAgo } from "@/lib/store";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "City Issue Map — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: MapPage,
});

/** Assign a deterministic pseudo-lat/lng to any report that doesn't have real coords.
 *  Centers around India (20.5937° N, 78.9629° E) with ±4° spread.
 */
function pseudoLatLng(loc: string, id: string): { lat: number; lng: number } {
  let h = 0;
  const s = loc + id;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  const lat = 18 + (Math.abs(h % 1000) / 1000) * 10;  // 18–28°N
  const h2 = (h * 1000003) & 0xffffffff;
  const lng = 72 + (Math.abs(h2 % 1000) / 1000) * 15; // 72–87°E
  return { lat, lng };
}

function urgencyColor(u: string) {
  if (u === "Critical") return "#ef4444";
  if (u === "High") return "#f97316";
  if (u === "Medium") return "#eab308";
  return "#22c55e";
}

function MapPage() {
  const { reports } = useReports();
  const [active, setActive] = useState<Set<Category>>(new Set(CATEGORIES));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (c: Category) => {
    setActive((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c); else n.add(c);
      return n;
    });
  };
  const reset = () => setActive(new Set(CATEGORIES));

  const visible = reports.filter((r) => active.has(r.category));
  const selectedReport = visible.find((r) => r.id === selected);

  // Build OSM markers URL for the iframe if we have real coords
  const reportsWithCoords = useMemo(
    () => visible.map((r) => ({
      ...r,
      _lat: r.lat ?? pseudoLatLng(r.location, r.id).lat,
      _lng: r.lng ?? pseudoLatLng(r.location, r.id).lng,
    })),
    [visible],
  );

  // Centre of all visible reports (or India centre)
  const centre = useMemo(() => {
    if (reportsWithCoords.length === 0) return { lat: 22, lng: 78 };
    const avgLat = reportsWithCoords.reduce((s, r) => s + r._lat, 0) / reportsWithCoords.length;
    const avgLng = reportsWithCoords.reduce((s, r) => s + r._lng, 0) / reportsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [reportsWithCoords]);

  // Build an OSM map URL with markers (works best with few pins)
  const mapSrc = useMemo(() => {
    if (reportsWithCoords.length === 0) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=68,8,97,36&layer=mapnik`;
    }
    // Use first pinned report or centre
    const pinLat = selectedReport?.lat ?? centre.lat;
    const pinLng = selectedReport?.lng ?? centre.lng;
    const zoom = selectedReport ? 0.05 : 8;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${pinLng - zoom},${pinLat - zoom},${pinLng + zoom},${pinLat + zoom}&layer=mapnik&marker=${pinLat},${pinLng}`;
  }, [reportsWithCoords, centre, selectedReport]);

  return (
    <AppShell>
      <div className="flex gap-4 h-[calc(100vh-10rem)]">
        {/* Sidebar */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-auto">
          {/* Filter */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold mb-3">Filter by Category</h2>
            <ul className="space-y-2 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <input type="checkbox" checked={active.has(c)} onChange={() => toggle(c)} id={`cat-${c}`} />
                  <label htmlFor={`cat-${c}`} className="cursor-pointer">{c}</label>
                </li>
              ))}
            </ul>
            <button onClick={reset}
              className="mt-3 w-full py-2 border border-border rounded-lg text-sm bg-card hover:bg-muted transition-colors">
              Reset
            </button>
            <p className="mt-3 text-xs text-muted-foreground">Showing {visible.length} of {reports.length}</p>
          </div>

          {/* Report list */}
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm flex-1 overflow-auto">
            <h2 className="font-bold mb-2 px-1 text-sm">Reports</h2>
            {visible.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No reports to show.</p>
            )}
            {visible.map((r) => (
              <button key={r.id} onClick={() => setSelected(r.id === selected ? null : r.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-colors ${
                  selected === r.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: urgencyColor(r.urgency) }} />
                  <p className="text-sm font-medium truncate">{r.title}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 ml-4 truncate">{r.location}</p>
                <p className="text-[10px] text-muted-foreground ml-4">{timeAgo(r.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-border relative">
          <iframe
            key={mapSrc}
            title="Issue Map"
            className="w-full h-full"
            frameBorder="0"
            src={mapSrc}
          />
          {/* Overlay legend */}
          <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 text-xs shadow-lg">
            <p className="font-semibold mb-1.5">Urgency</p>
            {[["Critical","#ef4444"],["High","#f97316"],["Medium","#eab308"],["Low","#22c55e"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
          {/* Selected report popup */}
          {selectedReport && (
            <div className="absolute top-3 left-3 bg-card border border-border rounded-xl p-3 shadow-xl w-64 z-10">
              <div className="flex items-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: urgencyColor(selectedReport.urgency) }} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedReport.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedReport.category} · {selectedReport.urgency}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedReport.location}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">By {selectedReport.reporterName} · {timeAgo(selectedReport.createdAt)}</p>
                  {(selectedReport.lat && selectedReport.lng) && (
                    <p className="text-[10px] text-primary mt-1">📍 Real GPS: {selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="absolute top-2 right-2 w-5 h-5 grid place-items-center rounded-full hover:bg-muted text-muted-foreground">
                <span className="text-xs">✕</span>
              </button>
            </div>
          )}

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
      </div>
    </AppShell>
  );
}