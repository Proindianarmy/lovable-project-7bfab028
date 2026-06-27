import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MapPin, X } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useReports, CATEGORIES, type Category, timeAgo } from "@/lib/store";
import { useState, useMemo, useEffect, useRef } from "react";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "City Issue Map — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: MapPage,
});

function pseudoLatLng(loc: string, id: string) {
  let h = 0;
  const s = loc + id;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  const lat = 18 + (Math.abs(h % 1000) / 1000) * 10;
  const h2 = (h * 1000003) & 0xffffffff;
  const lng = 72 + (Math.abs(h2 % 1000) / 1000) * 15;
  return { lat, lng };
}

function urgencyColor(u: string) {
  if (u === "Critical") return "#ef4444";
  if (u === "High") return "#f97316";
  if (u === "Medium") return "#eab308";
  return "#22c55e";
}

function urgencyHex(u: string) {
  return urgencyColor(u).replace("#", "");
}

// Interactive Leaflet map showing ALL pins
function LeafletMap({
  reports, selectedId, onSelect,
}: {
  reports: Array<{ id: string; title: string; lat: number; lng: number; urgency: string; category: string; location: string }>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const onSelectRef = useRef(onSelect);

  // Keep ref in sync with latest prop without stale closures
  useEffect(() => { onSelectRef.current = onSelect; });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if ((window as any).L) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const L = (window as any).L;
    const map = L.map(mapDivRef.current, { zoomControl: true }).setView([22, 79], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    map.on("click", () => onSelectRef.current(null));
    mapRef.current = map;
  }, [ready]);

  // Add / update markers whenever reports change
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    const map = mapRef.current;

    // Remove old markers that are no longer in the list
    const currentIds = new Set(reports.map((r) => r.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { map.removeLayer(marker); markersRef.current.delete(id); }
    });

    // Add new markers
    reports.forEach((r) => {
      if (markersRef.current.has(r.id)) return; // already on map
      const color = urgencyColor(r.urgency);
      const icon = L.divIcon({
        className: "",
        html: `<div title="${r.title}" style="
          width:28px;height:28px;
          background:${color};
          border:3px solid #fff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          cursor:pointer;
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const marker = L.marker([r.lat, r.lng], { icon }).addTo(map);
      marker.on("click", (e: any) => {
        e.originalEvent.stopPropagation();
        onSelectRef.current(r.id);
      });
      markersRef.current.set(r.id, marker);
    });
  }, [ready, reports]);

  // When selectedId changes: pan to it and highlight
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (selectedId) {
      const r = reports.find((x) => x.id === selectedId);
      if (r) mapRef.current.flyTo([r.lat, r.lng], 14, { animate: true, duration: 0.8 });
    }
  }, [selectedId, ready]);

  return (
    <div ref={mapDivRef} className="w-full h-full" style={{ minHeight: 400 }} />
  );
}

function MapPage() {
  const { reports } = useReports();
  const [active, setActive] = useState<Set<Category>>(new Set(CATEGORIES));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (c: Category) =>
    setActive((prev) => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const visible = reports.filter((r) => active.has(r.category));
  const selectedReport = visible.find((r) => r.id === selected) ?? null;

  // All visible reports with resolved coords
  const pinned = useMemo(
    () =>
      visible.map((r) => {
        const coords = r.lat && r.lng ? { lat: r.lat, lng: r.lng } : pseudoLatLng(r.location, r.id);
        return { id: r.id, title: r.title, urgency: r.urgency, category: r.category, location: r.location, ...coords };
      }),
    [visible],
  );

  return (
    <AppShell>
      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        {/* Sidebar */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-auto">
          {/* Filters */}
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
            <button
              onClick={() => { setActive(new Set(CATEGORIES)); setSelected(null); }}
              className="mt-3 w-full py-2 border border-border rounded-lg text-sm bg-card hover:bg-muted"
            >
              Show All
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              {visible.length} of {reports.length} reports shown
            </p>
          </div>

          {/* Report list */}
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm flex-1 overflow-auto">
            <h2 className="font-bold mb-2 px-1 text-sm">Reports</h2>
            {visible.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No reports to show.</p>
            )}
            {visible.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id === selected ? null : r.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-colors ${
                  selected === r.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                }`}
              >
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
          {reports.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="font-semibold">No issues reported yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Reports will appear as pins once submitted.</p>
              </div>
            </div>
          ) : (
            <LeafletMap reports={pinned} selectedId={selected} onSelect={setSelected} />
          )}

          {/* Urgency legend */}
          <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 text-xs shadow-lg z-[1000]">
            <p className="font-semibold mb-1.5">Urgency</p>
            {[["Critical","#ef4444"],["High","#f97316"],["Medium","#eab308"],["Low","#22c55e"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>

          {/* Selected report info card */}
          {selectedReport && (
            <div className="absolute top-3 left-3 bg-card border border-border rounded-xl p-3 shadow-xl w-64 z-[1000]">
              <div className="flex items-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: urgencyColor(selectedReport.urgency) }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{selectedReport.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedReport.category} · {selectedReport.urgency}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedReport.location}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">By {selectedReport.reporterName} · {timeAgo(selectedReport.createdAt)}</p>
                  {selectedReport.lat && selectedReport.lng && (
                    <p className="text-[10px] text-primary mt-1">📍 GPS: {selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)}</p>
                  )}
                  <Link to="/issue/$id" params={{ id: selectedReport.id }}
                    className="mt-2 text-xs text-primary hover:underline block">
                    View full report →
                  </Link>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded-full hover:bg-muted text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}