import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, RotateCcw, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { checkImageQuality, validateFormatAndSize } from "@/lib/imageQuality";
import { simulateAIDetection } from "@/lib/store";
import { reportsApi } from "@/lib/api";

export interface AcceptedPhoto {
  dataUrl: string;
  file: File;
  category?: string;
  label?: string;
  tags: string[];
  confidence?: number;
}

interface ImageCaptureProps {
  disabled?: boolean;
  onAccepted: (photo: AcceptedPhoto) => void;
  /** Optional: label shown on the add-photo controls, e.g. "1/5 photos used" */
  helperText?: string;
}

type PipelineStage =
  | "idle"
  | "checking-format"
  | "checking-quality"
  | "detecting-ai"
  | "verifying-content";

const STAGE_LABEL: Record<PipelineStage, string> = {
  idle: "",
  "checking-format": "Checking file…",
  "checking-quality": "Checking photo quality…",
  "detecting-ai": "Scanning for AI-generated content…",
  "verifying-content": "Verifying this shows a civic issue…",
};

function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  return fetch(dataUrl)
    .then((r) => r.blob())
    .then((blob) => new File([blob], filename, { type: blob.type || "image/jpeg" }));
}

/* =========================================================
 * Live camera modal — works on desktop webcams as well as
 * Android/iPhone mobile browsers via getUserMedia.
 * ========================================================= */
function LiveCameraModal({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setReady(false);
      return;
    }
    let cancelled = false;
    setError(null);
    setReady(false);

    (async () => {
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError(
            "Camera permission was denied. Please allow camera access, or use Upload from Gallery instead.",
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No camera was found on this device. Please use Upload from Gallery instead.");
        } else {
          setError("Could not access the camera. Please use Upload from Gallery instead.");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facingMode, stopStream]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopStream();
    onCapture(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 w-8 h-8 grid place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Close camera"
        >
          <X className="w-4 h-4" />
        </button>
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>📷 Take Live Photo</DialogTitle>
          <DialogDescription>Frame the issue clearly, then tap capture.</DialogDescription>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] sm:aspect-video w-full">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-6 text-white">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
              {!ready && (
                <div className="absolute inset-0 grid place-items-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 p-4">
          {!error && (
            <button
              type="button"
              onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
              className="w-10 h-10 grid place-items-center rounded-full border border-border hover:bg-muted"
              aria-label="Flip camera"
              title="Flip camera"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={capture}
            disabled={!ready || !!error}
            className="w-16 h-16 rounded-full border-4 border-primary grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Capture photo"
          >
            <span className="w-12 h-12 rounded-full bg-primary" />
          </button>
          <div className="w-10 h-10" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
 * Main image capture + validation pipeline component
 * ========================================================= */
export function ImageCapture({ disabled, onAccepted, helperText }: ImageCaptureProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [cameraSupported, setCameraSupported] = useState(true);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mobileCaptureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cameras require a secure context (https or localhost) and the
    // mediaDevices API. If either is missing we fall back straight to
    // the native-camera file input (mobile) / gallery (desktop) so the
    // app never breaks on older or restricted browsers.
    const supported =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      (window.isSecureContext ?? true);
    setCameraSupported(supported);
  }, []);

  const busy = stage !== "idle";

  /* Runs the shared validation pipeline against any captured/selected file */
  const runPipeline = useCallback(
    async (file: File) => {
      setStage("checking-format");
      const formatCheck = validateFormatAndSize(file);
      if (!formatCheck.ok) {
        toast.error(formatCheck.reason);
        setStage("idle");
        return;
      }

      setStage("checking-quality");
      let quality;
      try {
        quality = await checkImageQuality(file);
      } catch {
        toast.error("Could not read this image. Please try a different photo.");
        setStage("idle");
        return;
      }
      if (!quality.ok) {
        toast.error(quality.reason);
        setStage("idle");
        return;
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      setStage("detecting-ai");
      const aiResult = await simulateAIDetection(dataUrl);
      if (aiResult.isAIGenerated) {
        toast.error(
          `This looks AI-generated or hand-drawn (${aiResult.aiGeneratedConfidence}% confidence). Please upload a real photo.`,
          { duration: 5500 },
        );
        setStage("idle");
        return;
      }

      setStage("verifying-content");
      try {
        const verify = await reportsApi.validateImage(file, file.name);
        if (verify.verified && verify.valid === false) {
          toast.error(
            verify.message ||
              "This image does not appear to show a valid civic issue. Please upload a clear photo of the reported problem.",
            { duration: 5500 },
          );
          setStage("idle");
          return;
        }
        onAccepted({
          dataUrl,
          file,
          category: verify.category ?? aiResult.category,
          label: verify.label,
          tags: aiResult.tags,
          confidence: verify.confidence ?? aiResult.confidence,
        });
        toast.success(
          verify.skipped ? "Photo accepted." : `Photo verified${verify.label ? ` — ${verify.label}` : ""}.`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        toast.error(`Could not verify this photo (${msg}). Please try again.`);
      } finally {
        setStage("idle");
      }
    },
    [onAccepted],
  );

  const handleGalleryFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void runPipeline(file);
  };

  const handleLiveCaptured = async (dataUrl: string) => {
    setCameraOpen(false);
    const file = await dataUrlToFile(dataUrl, `live_photo_${Date.now()}.jpg`);
    void runPipeline(file);
  };

  const handleTakeLivePhoto = () => {
    if (disabled || busy) return;
    if (cameraSupported) {
      setCameraOpen(true);
    } else {
      // Mobile fallback: the `capture` attribute opens the native camera
      // directly on Android Chrome and iOS Safari without needing getUserMedia.
      mobileCaptureInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleTakeLivePhoto}
          disabled={disabled || busy}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-4 hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Take Live Photo</span>
        </button>

        <button
          type="button"
          onClick={() => !disabled && !busy && galleryInputRef.current?.click()}
          disabled={disabled || busy}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 py-4 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs font-medium">Upload from Gallery</span>
        </button>
      </div>

      {helperText && <p className="text-[11px] text-muted-foreground text-center">{helperText}</p>}

      {busy && (
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          {STAGE_LABEL[stage]}
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handleGalleryFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {/* Mobile-only camera fallback when getUserMedia isn't available */}
      <input
        ref={mobileCaptureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (!e.target.files?.length) {
            // User backed out of the native camera UI — fall back to gallery
            // so they're never stuck without a way to add a photo.
            galleryInputRef.current?.click();
          } else {
            handleGalleryFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      <LiveCameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleLiveCaptured} />
    </div>
  );
}
