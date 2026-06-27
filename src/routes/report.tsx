import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  MapPin, Sparkles, Loader2, AlertTriangle, ImagePlus, X, CheckCircle2, Navigation, Move,
} from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  CATEGORIES, type Category, type Urgency, useReports, useAuth,
  useNotifications, simulateAIDetection, detectSpam, censorText,
  INDIA_STATES, INDIA_CITIES_BY_STATE, validatePincode,
} from "@/lib/store";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Report a New Civic Issue — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Report,
});

const MAX_PHOTOS = 5;

/* =========================================================
 * Interactive click-to-pin map using Leaflet loaded from CDN
 * Works without installing any npm package.
 * ========================================================= */
function InteractiveMap({
  lat, lng, onPin,
}: {
  lat?: number;
  lng?: number;
  onPin: (lat: number, lng: number) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Load Leaflet CSS + JS from CDN once
  useEffect(() => {
    if (typeof window === "undefined") return;
    // CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // JS
    if ((window as any).L) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map after Leaflet is ready
  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const L = (window as any).L;
    const initLat = lat ?? 20.5937;
    const initLng = lng ?? 78.9629;
    const zoom = lat && lng ? 14 : 5;

    const map = L.map(mapDivRef.current, { zoomControl: true }).setView([initLat, initLng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Custom draggable marker icon
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:32px;height:32px;background:#6366f1;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    if (lat && lng) {
      const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      marker.bindPopup("📍 Drag to adjust").openPopup();
      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        onPin(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }

    // Click anywhere to set/move pin
    map.on("click", (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const marker = L.marker([clickLat, clickLng], { draggable: true, icon }).addTo(map);
        marker.bindPopup("📍 Drag to adjust").openPopup();
        marker.on("dragend", (ev: any) => {
          const pos = ev.target.getLatLng();
          onPin(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }
      onPin(clickLat, clickLng);
    });

    mapRef.current = map;
  }, [ready]);

  // When lat/lng change externally (GPS button), move the marker
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (lat == null || lng == null) return;
    const L = (window as any).L;
    const map = mapRef.current;
    map.setView([lat, lng], 15);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;background:#6366f1;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        onPin(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }
  }, [lat, lng, ready]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 220 }}>
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {ready && !lat && !lng && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-3">
          <span className="text-[11px] bg-black/60 text-white px-2 py-0.5 rounded-full">
            Tap anywhere on the map to drop a pin
          </span>
        </div>
      )}
    </div>
  );
}

function Report() {
  const navigate = useNavigate();
  const { user, addPoints } = useAuth();
  const { addReport, findSimilar, upvote } = useReports();
  const { push } = useNotifications();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [urgency, setUrgency] = useState<Urgency | "">("");

  // Location state
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [gettingLocation, setGettingLocation] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [analyzingIdx, setAnalyzingIdx] = useState<number | null>(null);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>();
  const [spamInfo, setSpamInfo] = useState<{ score: number; reasons: string[] } | null>(null);
  const [dupDialog, setDupDialog] = useState<null | { existingId: string; existingTitle: string }>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState("");

  const cities = state ? (INDIA_CITIES_BY_STATE[state] ?? []) : [];

  useEffect(() => {
    if (pincode.length === 6) {
      setPincodeValid(validatePincode(pincode));
    } else {
      setPincodeValid(null);
    }
  }, [pincode]);

  // Auto-request GPS on mount — silently, no toast
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          // Silent — no toast, no notification
        },
        () => { /* silent fail */ },
      );
    }
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser.");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGettingLocation(false);
        toast.success("Location updated — drag the pin to fine-tune.");
      },
      () => {
        setGettingLocation(false);
        toast.error("Could not get your location. Allow location access and try again.");
      },
    );
  };

  // Called when user clicks map or drags marker — saves this as the report location
  const handleMapPin = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  const handleImages = async (files: FileList) => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed per report.`);
      return;
    }
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          const idx = photos.length + toProcess.indexOf(file);
          setAnalyzingIdx(idx);
          const result = await simulateAIDetection(dataUrl);
          setAnalyzingIdx(null);

          if (result.isAIGenerated) {
            toast.error(
              `Photo ${toProcess.indexOf(file) + 1} detected as AI-generated or hand-drawn (${result.aiGeneratedConfidence}% confidence) — removed.`,
              { duration: 5000 },
            );
          } else {
            setPhotos((prev) => [...prev, dataUrl]);
            if (idx === 0) {
              setAiTags(result.tags);
              setAiConfidence(result.confidence);
              if (!category) setCategory(result.category);
            }
            toast.success(`Photo accepted (${result.confidence}% real photo)`);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    if (i === 0) { setAiTags([]); setAiConfidence(undefined); }
  };

  const onTextChange = (t: string, d: string) => {
    if (t.length > 0 || d.length > 0) setSpamInfo(detectSpam(t, d));
    else setSpamInfo(null);
  };

  const fullLocation = [address, city, state, pincode].filter(Boolean).join(", ");

  const submit = (force = false) => {
    if (!title.trim() || !description.trim() || !category || !urgency) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!state || !city) {
      toast.error("Location is required. Please select a state and city.");
      return;
    }
    if (pincode && pincodeValid === false) {
      toast.error("Please enter a valid 6-digit Indian pincode.");
      return;
    }
    const spam = detectSpam(title, description);
    if (spam.score >= 6) {
      toast.error("This report looks like spam. Please add a meaningful description.");
      return;
    }
    const { text: cleanTitle, flagged: tF } = censorText(title);
    const { text: cleanDesc, flagged: dF } = censorText(description);

    if (!force) {
      const sim = findSimilar(category as Category, fullLocation);
      if (sim) {
        setDupDialog({ existingId: sim.id, existingTitle: sim.title });
        return;
      }
    }

    const newReport = addReport({
      title: cleanTitle,
      description: cleanDesc,
      category: category as Category,
      location: fullLocation,
      city,
      state,
      pincode,
      // Save the user-chosen pin coordinates (GPS or map click)
      lat,
      lng,
      urgency: urgency as Urgency,
      photos: photos.length > 0 ? photos : undefined,
      image: photos[0],
      aiTags,
      aiConfidence,
      reporterId: user?.id ?? "anon",
      reporterName: user?.name ?? "Anonymous",
      reporterAvatar: user?.avatar,
      censored: tF || dF,
    });
    addPoints(10, "Issue reported");
    push({
      type: "system",
      title: "Report submitted",
      body: `Your report "${newReport.title}" is now live in the feed.`,
      reportId: newReport.id,
    });
    setSubmittedTitle(newReport.title);
    setShowCongrats(true);
  };

  return (
    <AppShell title="Report a New Civic Issue">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Panel 1 — Issue Details */}
        <Panel step={1} title="Issue Details">
          <Field label="Title *">
            <input value={title}
              onChange={(e) => { setTitle(e.target.value); onTextChange(e.target.value, description); }}
              placeholder="Brief description of the issue"
              className="inp" />
          </Field>
          <Field label="Description *">
            <textarea rows={5} value={description}
              onChange={(e) => { setDescription(e.target.value); onTextChange(title, e.target.value); }}
              placeholder="Describe the problem in detail (min. 20 characters)."
              className="inp resize-none" />
          </Field>
          <Field label="Category *">
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="inp">
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Urgency *">
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)} className="inp">
              <option value="" disabled>Select urgency</option>
              {(["Low", "Medium", "High", "Critical"] as Urgency[]).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
          {spamInfo && spamInfo.score >= 3 && (
            <div className="rounded-lg border border-yellow-400/50 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-300 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">Your report may be flagged (score {spamInfo.score}/10):</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {spamInfo.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            </div>
          )}
        </Panel>

        {/* Panel 2 — Photos */}
        <Panel step={2} title={`Photos (${photos.length}/${MAX_PHOTOS})`}>
          <p className="text-xs text-muted-foreground mb-2">
            Select up to {MAX_PHOTOS} real photos. AI-generated or hand-drawn images are automatically rejected.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white grid place-items-center hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { if (e.target.files?.length) handleImages(e.target.files); e.target.value = ""; }} />
                <ImagePlus className="w-7 h-7 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">Add Photo</span>
              </label>
            )}
          </div>

          {analyzingIdx !== null && (
            <div className="flex items-center gap-2 text-sm text-primary p-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Analyzing image with AI...
            </div>
          )}

          {analyzingIdx === null && aiTags.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="w-4 h-4" /> AI Detection
                {aiConfidence != null && (
                  <span className="ml-auto badge-pill bg-primary text-primary-foreground">
                    {aiConfidence}% confidence
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aiTags.map((t) => (
                  <span key={t} className="badge-pill bg-background border border-border">{t}</span>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Panel 3 — Location */}
        <Panel step={3} title="Location">
          <Field label="State *">
            <select value={state} onChange={(e) => { setState(e.target.value); setCity(""); }} className="inp">
              <option value="" disabled>Select state / UT</option>
              {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="City *">
            <select value={city} onChange={(e) => setCity(e.target.value)} className="inp" disabled={!state}>
              <option value="" disabled>{state ? "Select city" : "Select state first"}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Pincode">
            <div className="relative">
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit pincode"
                className={`inp pr-8 ${
                  pincodeValid === true
                    ? "border-green-500 focus:ring-green-500"
                    : pincodeValid === false
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                maxLength={6}
              />
              {pincodeValid === true && (
                <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
              {pincodeValid === false && (
                <X className="w-4 h-4 text-red-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>
            {pincodeValid === false && (
              <p className="text-xs text-red-500 mt-1">Please enter a valid 6-digit Indian pincode.</p>
            )}
          </Field>

          <Field label="Address / Landmark">
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, intersection, or landmark"
                className="inp pl-9"
              />
            </div>
          </Field>

          {/* Interactive map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Move className="w-3.5 h-3.5 text-muted-foreground" />
                Pin Exact Location
              </div>
              <button
                type="button"
                onClick={getLocation}
                disabled={gettingLocation}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                {gettingLocation
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Locating…</>
                  : <><Navigation className="w-3 h-3" /> Use GPS</>}
              </button>
            </div>

            <InteractiveMap lat={lat} lng={lng} onPin={handleMapPin} />

            {lat && lng ? (
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                📍 {lat.toFixed(5)}, {lng.toFixed(5)} — <span className="text-primary">click map or drag pin to adjust</span>
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                No pin set yet. Allow GPS or click on the map above.
              </p>
            )}
          </div>

          <button
            onClick={() => submit(false)}
            className="mt-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Submit Report
          </button>
        </Panel>
      </div>

      {/* Duplicate dialog */}
      <Dialog open={!!dupDialog} onOpenChange={(o) => !o && setDupDialog(null)}>
        <DialogContent>
          <button
            onClick={() => setDupDialog(null)}
            className="absolute right-4 top-4 w-7 h-7 grid place-items-center rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <DialogHeader>
            <DialogTitle>Similar issue already reported</DialogTitle>
            <DialogDescription>
              We found a similar report nearby: <b>{dupDialog?.existingTitle}</b>.
              You can upvote the existing one instead, view it, or submit anyway.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <button
              className="px-4 py-2 rounded-md border border-border text-sm"
              onClick={() => { setDupDialog(null); navigate({ to: "/issue/$id", params: { id: dupDialog!.existingId } }); }}
            >
              View Existing
            </button>
            <button
              className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm"
              onClick={() => {
                if (user && dupDialog) {
                  upvote(dupDialog.existingId, user.id);
                  addPoints(2, "Upvoted an issue");
                  setDupDialog(null);
                  navigate({ to: "/feed" });
                }
              }}
            >
              Upvote Existing
            </button>
            <button
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
              onClick={() => { setDupDialog(null); submit(true); }}
            >
              Submit Anyway
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Congratulations popup */}
      {showCongrats && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setShowCongrats(false); navigate({ to: "/feed" }); }}
              className="absolute right-3 top-3 w-8 h-8 grid place-items-center rounded-full hover:bg-muted"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
            <p className="text-muted-foreground text-sm mb-1">
              Your report <span className="font-semibold text-foreground">"{submittedTitle}"</span> is now live.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              You earned <span className="font-semibold text-primary">+10 XP</span> for reporting!
              {lat && lng && <><br /><span className="text-xs">📍 Location saved to map</span></>}
            </p>
            <button
              onClick={() => { setShowCongrats(false); navigate({ to: "/feed" }); }}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
            >
              View in Feed
            </button>
          </div>
        </div>
      )}

      <style>{`
        .inp {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-background);
          color: var(--color-foreground);
          font-size: 0.875rem;
          outline: none;
          box-sizing: border-box;
        }
        .inp:focus { box-shadow: 0 0 0 2px var(--color-ring); }
        .inp.pl-9 { padding-left: 2.25rem; }
        .inp.pr-8 { padding-right: 2rem; }
        /* Fix Leaflet z-index inside the app */
        .leaflet-container { z-index: 1; }
        .leaflet-pane { z-index: 1 !important; }
        .leaflet-top, .leaflet-bottom { z-index: 2 !important; }
      `}</style>
    </AppShell>
  );
}

function Panel({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <header className="flex items-center gap-3 mb-5">
        <span className="w-8 h-8 grid place-items-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
          {step}
        </span>
        <h2 className="font-bold text-lg">{title}</h2>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}