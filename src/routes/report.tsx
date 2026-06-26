import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { UploadCloud, MapPin } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Report a New Civic Issue — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Report,
});

function Report() {
  return (
    <AppShell title="Report a New Civic Issue">
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel step={1} title="Issue Details">
          <Field label="Title">
            <input placeholder="Brief description of the issue" className="input" />
          </Field>
          <Field label="Description">
            <textarea
              rows={5}
              placeholder="Describe the problem in detail — what you observed, any safety risks, and how long it has been present."
              className="input resize-none"
            />
          </Field>
          <Field label="Severity">
            <select className="input" defaultValue="">
              <option value="" disabled>Select severity level</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </Field>
        </Panel>

        <Panel step={2} title="Media Upload">
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Drag and drop photos here,<br />or click to select files
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Max 10 MB · JPEG, PNG, WEBP</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            GPS coordinates embedded in your photo will be used to auto-detect the issue location and verify authenticity.
          </p>
        </Panel>

        <Panel step={3} title="Location &amp; Category">
          <Field label="Issue Category">
            <select className="input" defaultValue="">
              <option value="" disabled>Select a category</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Environment">Environment</option>
              <option value="Safety">Safety</option>
              <option value="Public Services">Public Services</option>
              <option value="Other">Other</option>
            </select>
          </Field>

          <Field label="Map Location">
            <div className="relative mb-3">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Enter address or use current location" className="input pl-9" />
            </div>
            <div
              className="aspect-square rounded-xl overflow-hidden relative flex items-center justify-center"
              style={{
                backgroundColor: "#e8eaed",
                backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
                backgroundSize: "30px 30px",
              }}
            >
              <div className="text-center text-muted-foreground text-sm p-4 pointer-events-none">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Click to drop a pin or enter an address above</p>
              </div>
            </div>
          </Field>

          <button className="mt-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            Submit Report
          </button>
          <button className="mt-2 w-full py-2 text-sm text-primary font-medium hover:underline">
            Save Draft
          </button>
        </Panel>
      </div>

      <style>{`.input{width:100%;padding:0.625rem 0.875rem;border-radius:0.5rem;border:1px solid var(--color-border);background:var(--color-background);font-size:0.875rem;outline:none;}.input:focus{box-shadow:0 0 0 2px var(--color-ring);}`}</style>
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
        <h2 className="font-bold text-lg" dangerouslySetInnerHTML={{ __html: title }} />
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
