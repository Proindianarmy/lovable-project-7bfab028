import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { UploadCloud, MapPin, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useState } from "react";
import {
  CATEGORIES, type Category, type Urgency, useReports, useAuth,
  useNotifications, simulateAIDetection, detectSpam, censorText,
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

function Report() {
  const navigate = useNavigate();
  const { user, addPoints } = useAuth();
  const { addReport, findSimilar, upvote } = useReports();
  const { push } = useNotifications();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState<Urgency | "">("");
  const [image, setImage] = useState<string | undefined>();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>();
  const [spamInfo, setSpamInfo] = useState<{ score: number; reasons: string[] } | null>(null);
  const [dupDialog, setDupDialog] = useState<null | { existingId: string; existingTitle: string }>(null);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [aiGenConf, setAiGenConf] = useState(0);

  const handleImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImage(dataUrl);
      setAnalyzing(true);
      const result = await simulateAIDetection();
      setAiTags(result.tags);
      setAiConfidence(result.confidence);
      setIsAIGenerated(result.isAIGenerated);
      setAiGenConf(result.aiGeneratedConfidence);
      if (!category) setCategory(result.category);
      setAnalyzing(false);
      if (result.isAIGenerated) {
        toast.error(`Image may be AI-generated (${result.aiGeneratedConfidence}%)`);
      } else {
        toast.success(`AI detected: ${result.tags[0]} (${result.confidence}%)`);
      }
    };
    reader.readAsDataURL(file);
  };

  const onTextChange = (t: string, d: string) => {
    if (t.length > 0 || d.length > 0) {
      setSpamInfo(detectSpam(t, d));
    } else {
      setSpamInfo(null);
    }
  };

  const submit = (force = false) => {
    if (!title.trim() || !description.trim() || !category || !location.trim() || !urgency) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (isAIGenerated) {
      toast.error("Warning: Your image appears to be AI-generated. Please use a real photo.");
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
      const sim = findSimilar(category as Category, location);
      if (sim) {
        setDupDialog({ existingId: sim.id, existingTitle: sim.title });
        return;
      }
    }

    const newReport = addReport({
      title: cleanTitle,
      description: cleanDesc,
      category: category as Category,
      location,
      urgency: urgency as Urgency,
      image,
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
    toast.success("Report submitted!");
    navigate({ to: "/feed" });
  };

  return (
    <AppShell title="Report a New Civic Issue">
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel step={1} title="Issue Details">
          <Field label="Title *">
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); onTextChange(e.target.value, description); }}
              placeholder="Brief description of the issue"
              className="input"
            />
          </Field>
          <Field label="Description *">
            <textarea
              rows={5}
              value={description}
              onChange={(e) => { setDescription(e.target.value); onTextChange(title, e.target.value); }}
              placeholder="Describe the problem in detail (min. 20 characters)."
              className="input resize-none"
            />
          </Field>
          <Field label="Urgency *">
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)} className="input">
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
                <p className="font-semibold mb-1">
                  Your report may be flagged as spam (score {spamInfo.score}/10):
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {spamInfo.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            </div>
          )}
        </Panel>

        <Panel step={2} title="Photo + AI Detection">
          <label className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors block">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImage(f);
              }}
            />
            {image ? (
              <img src={image} alt="upload" className="max-h-48 mx-auto rounded-lg" />
            ) : (
              <>
                <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Click to upload a photo
                </p>
              </>
            )}
          </label>

          {analyzing && (
            <div className="flex items-center gap-2 text-sm text-primary p-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Analyzing image with AI...
            </div>
          )}

          {!analyzing && aiTags.length > 0 && (
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
              {isAIGenerated ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400 font-medium">
                  ⚠️ This image may be AI-generated ({aiGenConf}% confidence). Your report may be rejected.
                </div>
              ) : (
                <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400 font-medium">
                  ✓ Real photo detected ({100 - aiGenConf}% confidence this is a genuine photo)
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel step={3} title="Location & Category">
          <Field label="Category *">
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="input">
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Location *">
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Address, intersection, or landmark"
                className="input-with-icon"
              />
            </div>
          </Field>

          <button
            onClick={() => submit(false)}
            className="mt-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Submit Report
          </button>
        </Panel>
      </div>

      <Dialog open={!!dupDialog} onOpenChange={(o) => !o && setDupDialog(null)}>
        <DialogContent>
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

      <style>{`.input{width:100%;padding:0.625rem 0.875rem;border-radius:0.5rem;border:1px solid var(--color-border);background:var(--color-background);color:var(--color-foreground);font-size:0.875rem;outline:none;}.input:focus{box-shadow:0 0 0 2px var(--color-ring);}.input-with-icon{width:100%;padding:0.625rem 0.875rem 0.625rem 2.25rem;border-radius:0.5rem;border:1px solid var(--color-border);background:var(--color-background);color:var(--color-foreground);font-size:0.875rem;outline:none;}.input-with-icon:focus{box-shadow:0 0 0 2px var(--color-ring);}`}</style>
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
