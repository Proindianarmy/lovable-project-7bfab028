import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Flag, User, Wrench, Check, MapPin, Share2, BellRing, ThumbsUp, Loader2 } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/issue/$id")({
  head: ({ params }) => ({ meta: [{ title: `Issue #${params.id} — IssueSnap` }] }),
  beforeLoad: () => requireAuth(),
  loader: ({ params }) => ({ id: params.id }),
  component: IssueDetail,
  notFoundComponent: () => (
    <AppShell>
      <p className="text-muted-foreground">
        Issue not found.{" "}
        <Link to="/feed" className="text-primary underline">Back to feed</Link>
      </p>
    </AppShell>
  ),
});

const LIFECYCLE = [
  { icon: Flag,   label: "Pending"     },
  { icon: User,   label: "Assigned"    },
  { icon: Wrench, label: "In Progress" },
  { icon: Check,  label: "Resolved"    },
];

function IssueDetail() {
  const { id } = Route.useLoaderData();
  const issue: any = null;
  const comments: any[] = [];

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-6">Issue Details &amp; Timeline — #{id}</h1>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">

          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold mb-6">Status Lifecycle</h2>
            <ol className="flex justify-between relative">
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted" />
              {LIFECYCLE.map((step) => {
                const Icon = step.icon;
                const active = issue?.status === step.label;
                return (
                  <li key={step.label} className="relative flex flex-col items-center text-center w-20 z-10">
                    <div className={`w-10 h-10 grid place-items-center rounded-full border-2 bg-card ${
                      active ? "border-primary text-primary" : "border-border text-muted-foreground"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={`mt-2 text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {!issue ? (
            <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center justify-center text-muted-foreground min-h-[160px]">
              <Loader2 className="w-8 h-8 animate-spin mb-3 opacity-40" />
              <p className="text-sm">Loading issue details…</p>
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold mb-3">Issue Photos</h2>
                <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                  {issue.images?.map((img: string, i: number) => (
                    <div key={i} className="relative aspect-video bg-muted">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{issue.description}</p>
              </div>
            </>
          )}

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold mb-4">Comments &amp; Updates</h3>
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No comments yet. Updates from assigned departments will appear here.
              </p>
            ) : (
              <ul className="space-y-4">
                {comments.map((c, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
                    <div className="text-sm">
                      <p><span className="font-semibold">{c.author?.name}</span>: {c.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.createdAt}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div
              className="aspect-square relative flex items-center justify-center"
              style={{
                backgroundColor: "#e8eaed",
                backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
                backgroundSize: "30px 30px",
              }}
            >
              <MapPin className="w-8 h-8 text-primary opacity-50" />
            </div>
            <div className="p-4 text-sm">
              <strong>Location:</strong> {issue?.location?.address ?? "—"}
            </div>
          </div>
          <button className="w-full py-3 rounded-xl bg-success text-success-foreground font-semibold flex items-center justify-center gap-2">
            <ThumbsUp className="w-4 h-4" /> Support This Issue ({issue?.supporters?.length ?? 0})
          </button>
          <button className="w-full py-3 rounded-xl border border-border font-medium flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> Share Issue
          </button>
          <button className="w-full py-3 rounded-xl border border-border font-medium flex items-center justify-center gap-2">
            <BellRing className="w-4 h-4" /> Follow Updates
          </button>
        </aside>
      </div>
    </AppShell>
  );
}
