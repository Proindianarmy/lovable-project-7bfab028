import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  MapPin,
  Sparkles,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2,
  Navigation,
  Move,
} from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { ImageCapture, type AcceptedPhoto } from "@/components/ImageCapture";
import { useT } from "@/lib/i18n";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  CATEGORIES,
  type Category,
  type Urgency,
  useReports,
  useAuth,
  useNotifications,
  detectSpam,
  censorText,
  INDIA_STATES,
  INDIA_CITIES_BY_STATE,
  validatePincode,
} from "@/lib/store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Report a New Civic Issue — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Report,
});

const MAX_PHOTOS = 5;

/* ── Leaflet CDN typings (avoids no-explicit-any) ─────────────────────── */
interface LMarker {
  addTo: (m: LMap) => LMarker;
  bindPopup: (t: string) => LMarker;
  openPopup: () => LMarker;
  setLatLng: (ll: [number, number]) => void;
  on: (
    ev: string,
    cb: (e: {
      latlng: { lat: number; lng: number };
      target: { getLatLng: () => { lat: number; lng: number } };
    }) => void,
  ) => void;
}
interface LMap {
  setView: (ll: [number, number], z: number) => LMap;
  on: (ev: string, cb: (e: { latlng: { lat: number; lng: number } }) => void) => void;
}
interface LStatic {
  map: (el: HTMLElement, opts?: object) => LMap;
  tileLayer: (url: string, opts?: object) => { addTo: (m: LMap) => void };
  marker: (ll: [number, number], opts?: object) => LMarker;
  divIcon: (opts: object) => object;
}
const getLeaflet = (): LStatic | undefined => (window as Window & { L?: LStatic }).L;

/* =========================================================
 * Interactive click-to-pin map using Leaflet loaded from CDN
 * Works without installing any npm package.
 * ========================================================= */
function InteractiveMap({
  lat,
  lng,
  onPin,
  tapLabel,
}: {
  lat?: number;
  lng?: number;
  onPin: (lat: number, lng: number) => void;
  tapLabel?: string;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<LMarker | null>(null);
  const onPinRef = useRef(onPin);
  const [ready, setReady] = useState(false);

  // Keep onPinRef in sync without triggering re-runs
  useEffect(() => {
    onPinRef.current = onPin;
  });

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
    if (getLeaflet()) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map after Leaflet is ready
  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const L = getLeaflet();
    if (!L) return;
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
      marker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        onPinRef.current(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }

    // Click anywhere to set/move pin
    map.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const marker = L.marker([clickLat, clickLng], { draggable: true, icon }).addTo(map);
        marker.bindPopup("📍 Drag to adjust").openPopup();
        marker.on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          onPinRef.current(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }
      onPinRef.current(clickLat, clickLng);
    });

    mapRef.current = map;
  }, [ready]);

  // When lat/lng change externally (GPS button), move the marker
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    if (lat == null || lng == null) return;
    const L = getLeaflet();
    if (!L) return;
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
      marker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        onPinRef.current(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }
  }, [lat, lng, ready]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border"
      style={{ height: 220 }}
    >
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {ready && !lat && !lng && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-3">
          <span className="text-[11px] bg-black/60 text-white px-2 py-0.5 rounded-full">
            {tapLabel ?? "Tap anywhere on the map to drop a pin"}
          </span>
        </div>
      )}
    </div>
  );
}

function Report() {
  const navigate = useNavigate();
  const { user, addPoints } = useAuth();
  const { reports: storeReports, findSimilar } = useReports();
  const { push } = useNotifications();
  const t = useT();

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
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>();
  const [spamInfo, setSpamInfo] = useState<{ score: number; reasons: string[] } | null>(null);
  const [dupDialog, setDupDialog] = useState<null | { existingId: string; existingTitle: string }>(
    null,
  );
  const [showCongrats, setShowCongrats] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState("");

  const cities = state ? (INDIA_CITIES_BY_STATE[state] ?? []) : [];

  useEffect(() => {
    if (pincode.length === 6) {
      setPincodeValid(validatePincode(pincode));
    } else if (pincode.length > 0) {
      setPincodeValid(null); // still typing, no verdict yet
    } else {
      setPincodeValid(null); // empty = no validation
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
        () => {
          /* silent fail */
        },
      );
    }
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("geoNotSupported"));
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGettingLocation(false);
        toast.success(t("locationUpdated"));
      },
      () => {
        setGettingLocation(false);
        toast.error(t("locationError"));
      },
    );
  };

  // Called when user clicks map or drags marker — saves this as the report location
  const handleMapPin = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  const handlePhotoAccepted = useCallback(
    (photo: AcceptedPhoto) => {
      setPhotos((prev) => {
        if (prev.length >= MAX_PHOTOS) {
          toast.error(`Maximum ${MAX_PHOTOS} photos allowed per report.`);
          return prev;
        }
        const isFirst = prev.length === 0;
        if (isFirst) {
          if (photo.tags.length) setAiTags(photo.tags);
          if (photo.confidence != null) setAiConfidence(photo.confidence);
          if (photo.category) setCategory((c) => (c ? c : (photo.category as Category)));
        }
        return [...prev, photo.dataUrl];
      });
    },
    [],
  );

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    if (i === 0) {
      setAiTags([]);
      setAiConfidence(undefined);
    }
  };

  const onTextChange = (t: string, d: string) => {
    if (t.length > 0 || d.length > 0) setSpamInfo(detectSpam(t, d));
    else setSpamInfo(null);
  };

  const fullLocation = [address, city, state, pincode].filter(Boolean).join(", ");

  const submit = async (force = false) => {
    if (!title.trim() || !description.trim() || !category || !urgency) {
      toast.error(t("fillRequired"));
      return;
    }
    if (!state || !city) {
      toast.error(t("locationRequired"));
      return;
    }
    if (pincode && pincodeValid === false) {
      toast.error(t("pincodeInvalid"));
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

    // Build FormData to support photo uploads
    const fd = new FormData();
    fd.append("title", cleanTitle);
    fd.append("description", cleanDesc);
    fd.append("category", category);
    fd.append("location", fullLocation);
    fd.append("city", city);
    fd.append("state", state);
    fd.append("pincode", pincode);
    if (lat !== undefined) fd.append("lat", String(lat));
    if (lng !== undefined) fd.append("lng", String(lng));
    fd.append("urgency", urgency);
    if (aiTags?.length) fd.append("aiTags", JSON.stringify(aiTags));
    if (aiConfidence) fd.append("aiConfidence", String(aiConfidence));

    // Attach photo blobs if any base64 photos were captured
    // photos are stored as data URLs — convert & attach
    for (let i = 0; i < photos.length && i < 5; i++) {
      const dataUrl = photos[i];
      if (dataUrl.startsWith("data:")) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        fd.append("photos", blob, `photo_${i}.jpg`);
      }
    }

    try {
      const token = localStorage.getItem("token");
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiBase}/reports`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to submit report");

      const newReport = data.data.report;
      addPoints(10, "Issue reported");
      push({
        type: "system",
        title: "Report submitted",
        body: `Your report "${newReport.title}" is now live in the feed.`,
        reportId: newReport._id,
      });
      setSubmittedTitle(newReport.title);
      setShowCongrats(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast.error(msg);
    }
  };

  return (
    <AppShell title={t("reportNewIssue")}>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Panel 1 — Issue Details */}
        <Panel step={1} title={t("issueDetails")}>
          <Field label={`${t("title")} *`}>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                onTextChange(e.target.value, description);
              }}
              placeholder={t("titlePlaceholder")}
              className="inp"
            />
          </Field>
          <Field label={`${t("description")} *`}>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                onTextChange(title, e.target.value);
              }}
              placeholder={t("descriptionPlaceholder")}
              className="inp resize-none"
            />
          </Field>
          <Field label={`${t("category")} *`}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="inp"
            >
              <option value="" disabled>
                {t("selectCategory")}
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`${t("urgency")} *`}>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urgency)}
              className="inp"
            >
              <option value="" disabled>
                {t("selectUrgency")}
              </option>
              {(["Low", "Medium", "High", "Critical"] as Urgency[]).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          {spamInfo && spamInfo.score >= 3 && (
            <div className="rounded-lg border border-yellow-400/50 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-300 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">
                  {t("spamWarning")} ({spamInfo.score}/10):
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {spamInfo.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Panel>

        {/* Panel 2 — Photos */}
        <Panel step={2} title={`${t("photos")} (${photos.length}/${MAX_PHOTOS})`}>
          <p className="text-xs text-muted-foreground mb-2">
            {t("photosDesc")}
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
          </div>

          {photos.length < MAX_PHOTOS && (
            <ImageCapture
              onAccepted={handlePhotoAccepted}
              helperText={`${MAX_PHOTOS - photos.length} photo${MAX_PHOTOS - photos.length === 1 ? "" : "s"} remaining · JPG, PNG, WEBP up to 15MB`}
            />
          )}

          {aiTags.length > 0 && (
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
                  <span key={t} className="badge-pill bg-background border border-border">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Panel 3 — Location */}
        <Panel step={3} title={t("location")}>
          <Field label={`${t("state")} *`}>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
              }}
              className="inp"
            >
              <option value="" disabled>
                {t("selectState")}
              </option>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`${t("city")} *`}>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="inp"
              disabled={!state}
            >
              <option value="" disabled>
                {state ? t("selectCity") : t("selectStateFirst")}
              </option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("pincode")}>
            <div className="relative">
              <input
                value={pincode}
                onChange={(e) => {
                  // Only allow digits, max 6
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPincode(digits);
                }}
                placeholder={t("pincodePlaceholder")}
                inputMode="numeric"
                pattern="[0-9]*"
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
              <p className="text-xs text-red-500 mt-1">
                Please enter a valid 6-digit Indian pincode.
              </p>
            )}
          </Field>

          <Field label={t("landmark")}>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={address}
                onChange={(e) => {
                  const { text } = censorText(e.target.value);
                  setAddress(text);
                }}
                placeholder={t("landmarkPlaceholder")}
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
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> {t("locating")}
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" /> {t("useGPS")}
                  </>
                )}
              </button>
            </div>

            <InteractiveMap lat={lat} lng={lng} onPin={handleMapPin} tapLabel={t("tapMapToPin")} />

            {lat && lng ? (
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                📍 {lat.toFixed(5)}, {lng.toFixed(5)} —{" "}
                <span className="text-primary">{t("clickOrDragPin")}</span>
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                {t("noPinSet")}
              </p>
            )}
          </div>

          <button
            onClick={() => submit(false)}
            className="mt-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            {t("submitReport")}
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
              We found a similar report nearby: <b>{dupDialog?.existingTitle}</b>. You can upvote
              the existing one instead, view it, or submit anyway.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <button
              className="px-4 py-2 rounded-md border border-border text-sm"
              onClick={() => {
                setDupDialog(null);
                navigate({ to: "/issue/$id", params: { id: dupDialog!.existingId } });
              }}
            >
              {t("viewExisting")}
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
              {t("upvoteExisting")}
            </button>
            <button
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
              onClick={() => {
                setDupDialog(null);
                submit(true);
              }}
            >
              {t("submitAnyway")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Congratulations popup */}
      {showCongrats && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowCongrats(false);
                navigate({ to: "/feed" });
              }}
              className="absolute right-3 top-3 w-8 h-8 grid place-items-center rounded-full hover:bg-muted"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">{t("congratulations")}</h2>
            <p className="text-muted-foreground text-sm mb-1">
              Your report <span className="font-semibold text-foreground">"{submittedTitle}"</span>{" "}
              is now live.
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              You earned <span className="font-semibold text-primary">+10 XP</span> for reporting!
              {lat && lng && (
                <>
                  <br />
                  <span className="text-xs">📍 Location saved to map</span>
                </>
              )}
            </p>
            <button
              onClick={() => {
                setShowCongrats(false);
                navigate({ to: "/feed" });
              }}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
            >
              {t("viewInFeed")}
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

function Panel({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
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
