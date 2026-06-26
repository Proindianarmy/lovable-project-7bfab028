import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusBadge, SeverityBadge } from "@/components/AppShell";
import { Flag, Wrench, Check, MapPin, ThumbsUp, Send, AlertTriangle, Sparkles } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useReports, useAuth, computeRating, timeAgo } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/issue/$id")({
  head: ({ params }) => ({ meta: [{ title: `Issue #${params.id} — IssueSnap` }] }),
  beforeLoad: () => requireAuth(),
  component: IssueDetail,
});

const LIFECYCLE = [
  { icon: Flag, label: "Pending" },
  { icon: Wrench, label: "In Progress" },
  { icon: Check, label: "Resolved" },
];

function IssueDetail() {
  const { id } = Route.useParams();
  const { reports, upvote, addComment } = useReports();
  const { user, addPoints } = useAuth();
  const issue = reports.find((r) => r.id === id);
  const [comment, setComment] = useState("");
  const [showCensored, setShowCensored] = useState(false);

  if (!issue) {
    return (
      <AppShell>
        <p className="text-muted-foreground">
          Issue not found.{" "}
          <Link to="/feed" className="text-primary underline">Back to feed</Link>
        </p>
      </AppShell>
    );
  }

  const rating = computeRating(issue);
  const upvoted = user ? issue.upvotes.includes(user.id) : false;
  const isHeavilyFlagged = issue.spamFlags.length >= 3 || issue.censored;

  const handleComment = () => {
    if (!comment.trim() || !user) return;
    addComment(issue.id, user.id, user.name, comment.trim());
    addPoints(3, "Commented on a report");
    setComment("");
    toast.success("Comment posted!");
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{issue.title}</h1>
        <Link to="/feed" className="text-sm text-primary hover:underline">← Back to feed</Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <StatusBadge status={issue.status} />
        <SeverityBadge severity={issue.urgency} />
        <span className="badge-pill bg-muted text-muted-foreground">{issue.category}</span>
        <span className={`badge-pill ${rating.color}`}>{rating.emoji} {rating.label} · {rating.score}/10</span>
      </div>

      {isHeavilyFlagged && !showCensored ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-3" />
          <p className="font-semibold">This content has been flagged for review.</p>
          <button onClick={() => setShowCensored(true)} className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">
            Show anyway
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-bold mb-6">Status Timeline</h2>
              <ol className="flex justify-between relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted" />
                {LIFECYCLE.map((step) => {
                  const Icon = step.icon;
                  const active = issue.status === step.label;
                  return (
                    <li key={step.label} className="relative flex flex-col items-center text-center w-20 z-10">
                      <div className={`w-10 h-10 grid place-items-center rounded-full border-2 bg-card ${active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className={`mt-2 text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{step.label}</div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {issue.image && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold mb-3">Photo</h2>
                <img src={issue.image} alt="" className="w-full rounded-xl object-cover max-h-[400px]" />
                {issue.aiTags && issue.aiTags.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">AI detected:</span>
                    {issue.aiTags.map((t) => (
                      <span key={t} className="badge-pill bg-muted">{t}</span>
                    ))}
                    {issue.aiConfidence != null && (
                      <span className="badge-pill bg-primary text-primary-foreground">{issue.aiConfidence}%</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
              <p className="text-xs text-muted-foreground mt-4">
                Reported by {issue.reporterAvatar ?? "👤"} {issue.reporterName} · {timeAgo(issue.createdAt)}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-4">Comments ({issue.comments.length})</h3>
              {issue.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No comments yet.</p>
              ) : (
                <ul className="space-y-3 mb-4">
                  {issue.comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted grid place-items-center text-xs font-semibold shrink-0">
                        {c.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm flex-1">
                        <p><span className="font-semibold">{c.userName}</span> <span className="text-xs text-muted-foreground">· {timeAgo(c.at)}</span></p>
                        <p className="text-muted-foreground">{c.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                />
                <button onClick={handleComment} className="px-3 rounded-md bg-primary text-primary-foreground">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <strong>{issue.location}</strong>
              </div>
            </div>
            <button
              onClick={() => {
                if (!user) return;
                const wasUp = issue.upvotes.includes(user.id);
                upvote(issue.id, user.id);
                if (!wasUp) addPoints(2, "Upvoted an issue");
              }}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
                upvoted ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <ThumbsUp className="w-4 h-4" /> {upvoted ? "Upvoted" : "Upvote"} ({issue.upvotes.length})
            </button>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
