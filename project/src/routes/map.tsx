import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MapPin, X, ChevronUp, ChevronDown } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useReports, CATEGORIES, type Category, timeAgo } from "@/lib/store";
import { useApiReports } from "@/lib/useApi";
import { useState, useMemo, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/* ── Leaflet CDN typings ─────────────────────────────────────────────── */
interface LMarker {
  addTo: (map: LMap) => LMarker;
  on: (
    ev: string,
    cb: (e: {
      originalEvent?: Event;
      target: { getLatLng: () => { lat: number; lng: number } };
    }) => void,
  ) => void;
}
interface LMap {
  setView: (ll: [number, number], z: number) => LMap;
  on: (ev: string, cb: (e?: { latlng?: { lat: number; lng: number } }) => void) => void;
  removeLayer: (m: LMarker) => void;
  flyTo: (ll: [number, number], z: number, opts?: object) => void;
}
interface LStatic {
  map: (el: HTMLElement, opts?: object) => LMap;
  tileLayer: (url: string, opts?: object) => { addTo: (m: LMap) => void };
  marker: (ll: [number, number], opts?: object) => LMarker;
  divIcon: (opts: object) => object;
}
const getL = (): LStatic | undefined => (window as Window & { L?: LStatic }).L;

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

function LeafletMap({
  reports,
  selectedId,
  onSelect,
}: {
  reports: Array<{
    id: string;
    title: string;
    lat: number;
    lng: number;
    urgency: string;
    category: string;
    location: string;
  }>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markersRef = useRef<Map<string, LMarker>>(new Map());
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (getL()) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const L = getL();
    if (!L) return;
    const map = L.map(mapDivRef.current, { zoomControl: true }).setView([22, 79], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    map.on("click", () => onSelectRef.current(null));
    mapRef.current = map;
  }, [ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = getL();
    if (!L) return;
    const map = mapRef.current;
    const currentIds = new Set(reports.map((r) => r.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { map.removeLayer(marker); markersRef.current.delete(id); }
    });
    reports.forEach((r) => {
      if (markersRef.current.has(r.id)) return;
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
      marker.on("click", (e) => {
        e.originalEvent?.stopPropagation();
        onSelectRef.current(r.id);
      });
      markersRef.current.set(r.id, marker);
    });
  }, [ready, reports]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (selectedId) {
      const r = reports.find((x) => x.id === selectedId);
      if (r) mapRef.current.flyTo([r.lat, r.lng], 14, { animate: true, duration: 0.8 });
    }
  }, [selectedId, ready]);

  return <div ref={mapDivRef} className="w-full h-full" />;
}

function MapPage() {
  const { reports: storeReports } = useReports();
  const { reports: apiReports } = useApiReports();
  const isMobile = useIsMobile();

  const reports = apiReports.length > 0
    ? apiReports.map(r => ({
        ...r,
        id: r._id,
        reporterId: typeof r.reporter === "string" ? r.reporter : (r.reporter as {_id:string})?._id || "",
        createdAt: new Date(r.createdAt).getTime(),
        upvotes: r.upvotes || [],
        downvotes: r.downvotes || [],
        comments: r.comments || [],
        spamFlags: r.spamFlags || [],
      }))
    : storeReports;

  const [active, setActive] = useState<Set<Category>>(new Set(CATEGORIES));
  const [selected, setSelected] = useState<string | null>(null);
  // Mobile bottom sheet: "peek" (handle visible), "half" (half height), "full" (full panel)
  const [sheetState, setSheetState] = useState<"peek" | "half" | "full">("peek");

  const toggle = (c: Category) =>
    setActive((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c); else n.add(c);
      return n;
    });

  const visible = reports.filter((r) => active.has(r.category));
  const selectedReport = visible.find((r) => r.id === selected) ?? null;

  const pinned = useMemo(
    () =>
      visible.map((r) => {
        const coords = r.lat && r.lng ? { lat: r.lat, lng: r.lng } : pseudoLatLng(r.location, r.id);
        return { id: r.id, title: r.title, urgency: r.urgency, category: r.category, location: r.location, ...coords };
      }),
    [visible],
  );

  const sheetHeight = sheetState === "full" ? "85vh" : sheetState === "half" ? "45vh" : "56px";

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <AppShell>
        {/* Full-screen map — fills everything below the AppShell header */}
        <div className="relative -m-4 sm:-m-6" style={{ height: "calc(100vh - 4rem)" }}>
          {/* Map fills the whole screen */}
          <div className="absolute inset-0 isolate">
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
          </div>

          {/* Urgency legend — top right */}
          <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 text-xs shadow-lg z-[1000]">
            <p className="font-semibold mb-1.5">Urgency</p>
            {[["Critical","#ef4444"],["High","#f97316"],["Medium","#eab308"],["Low","#22c55e"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>

          {/* Selected report card — floats above map */}
          {selectedReport && (
            <div className="absolute top-3 left-3 bg-card border border-border rounded-xl p-3 shadow-xl w-64 z-[1000]">
              <div className="flex items-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: urgencyColor(selectedReport.urgency) }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{selectedReport.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedReport.category} · {selectedReport.urgency}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedReport.location}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">By {selectedReport.reporterName} · {timeAgo(selectedReport.createdAt)}</p>
                  <Link to="/issue/$id" params={{ id: selectedReport.id }} className="mt-2 text-xs text-primary hover:underline block">
                    View full report →
                  </Link>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded-full hover:bg-muted text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bottom sheet — filters + report list */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl shadow-2xl z-[1001] flex flex-col transition-all duration-300 ease-out"
            style={{ height: sheetHeight }}
          >
            {/* Drag handle / toggle row */}
            <button
              onClick={() => setSheetState(s => s === "peek" ? "half" : s === "half" ? "full" : "peek")}
              className="flex items-center justify-center gap-2 py-3 w-full shrink-0 touch-none"
              aria-label="Toggle filters panel"
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              {sheetState === "peek"
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground font-medium">
                {sheetState === "peek" ? "Filters & Reports" : sheetState === "half" ? "Expand" : "Collapse"}
              </span>
            </button>

            {/* Sheet content — only shown when not peeked */}
            {sheetState !== "peek" && (
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                {/* Filter chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-sm">Filter by Category</h2>
                    <button
                      onClick={() => { setActive(new Set(CATEGORIES)); setSelected(null); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Show All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggle(c)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active.has(c)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{visible.length} of {reports.length} reports shown</p>
                </div>

                {/* Report list */}
                <div>
                  <h2 className="font-bold text-sm mb-2">Reports</h2>
                  {visible.length === 0 && <p className="text-xs text-muted-foreground">No reports to show.</p>}
                  <div className="space-y-1">
                    {visible.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelected(r.id === selected ? null : r.id);
                          setSheetState("peek"); // collapse sheet so map is visible
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                          selected === r.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted bg-muted/40"
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
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // ── DESKTOP LAYOUT (unchanged) ─────────────────────────────────────────
  return (
    <AppShell>
      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        {/* Sidebar */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-auto">
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
            <p className="mt-2 text-xs text-muted-foreground">{visible.length} of {reports.length} reports shown</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm flex-1 overflow-auto">
            <h2 className="font-bold mb-2 px-1 text-sm">Reports</h2>
            {visible.length === 0 && <p className="text-xs text-muted-foreground px-1">No reports to show.</p>}
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
        <div className="flex-1 rounded-2xl overflow-hidden border border-border relative isolate">
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
          <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 text-xs shadow-lg z-[1000]">
            <p className="font-semibold mb-1.5">Urgency</p>
            {[["Critical","#ef4444"],["High","#f97316"],["Medium","#eab308"],["Low","#22c55e"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
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
                  <Link to="/issue/$id" params={{ id: selectedReport.id }} className="mt-2 text-xs text-primary hover:underline block">
                    View full report →
                  </Link>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded-full hover:bg-muted text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
