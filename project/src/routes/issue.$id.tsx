import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusBadge, SeverityBadge } from "@/components/AppShell";
import {
  Flag,
  Wrench,
  Check,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Send,
  AlertTriangle,
  Sparkles,
  X,
} from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useReports, useAuth, computeRating, timeAgo, censorText } from "@/lib/store";
import { useRef, useState } from "react";
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

// 3 second cooldown between votes to prevent spam
const VOTE_COOLDOWN_MS = 3000;

function IssueDetail() {
  const { id } = Route.useParams();
  const { reports, upvote, downvote, addComment } = useReports();
  const { user, addPoints } = useAuth();
  const issue = reports.find((r) => r.id === id);
  const [comment, setComment] = useState("");
  const [showCensored, setShowCensored] = useState(false);
  // Track last vote time per direction, keyed by issue id
  const voteCooldowns = useRef<Record<string, number>>({});
  // Track last comment time to prevent spam (5 sec cooldown)
  const lastCommentAt = useRef<number>(0);

  if (!issue) {
    return (
      <AppShell>
        <p className="text-muted-foreground">
          Issue not found.{" "}
          <Link to="/feed" className="text-primary underline">
            Back to feed
          </Link>
        </p>
      </AppShell>
    );
  }

  const rating = computeRating(issue);
  const upvoted = user ? issue.upvotes.includes(user.id) : false;
  const downvoted = user ? (issue.downvotes ?? []).includes(user.id) : false;
  const isHeavilyFlagged = issue.spamFlags.length >= 3 || issue.censored;

  const handleComment = () => {
    if (!comment.trim() || !user) return;
    const now = Date.now();
    if (now - lastCommentAt.current < 5000) {
      toast.error("Please wait a few seconds before commenting again.");
      return;
    }
    lastCommentAt.current = now;
    // Auto-censor curse words in comments
    const { text: clean } = censorText(comment.trim());
    addComment(issue.id, user.id, user.name, clean);
    // Only +1 XP for commenting (reduced to prevent spam)
    addPoints(1, "Commented on a report");
    setComment("");
    toast.success("Comment posted!");
  };

  const handleUpvote = () => {
    if (!user) return;
    const now = Date.now();
    const key = `up_${issue.id}`;
    if (now - (voteCooldowns.current[key] ?? 0) < VOTE_COOLDOWN_MS) {
      toast.error("Please wait before voting again.");
      return;
    }
    voteCooldowns.current[key] = now;
    const { wasUpvoted, wasDownvoted } = upvote(issue.id, user.id);
    if (wasUpvoted) {
      addPoints(-2, "Removed upvote");
    } else if (wasDownvoted) {
      addPoints(4, "Changed to upvote");
    } else {
      addPoints(2, "Upvoted an issue");
    }
  };

  const handleDownvote = () => {
    if (!user) return;
    const now = Date.now();
    const key = `dn_${issue.id}`;
    if (now - (voteCooldowns.current[key] ?? 0) < VOTE_COOLDOWN_MS) {
      toast.error("Please wait before voting again.");
      return;
    }
    voteCooldowns.current[key] = now;
    const { wasDownvoted, wasUpvoted } = downvote(issue.id, user.id);
    if (wasDownvoted) {
      addPoints(2, "Removed downvote");
    } else if (wasUpvoted) {
      addPoints(-4, "Changed to downvote");
    } else {
      addPoints(-2, "Downvoted an issue");
    }
  };

  const allPhotos =
    issue.photos && issue.photos.length > 0 ? issue.photos : issue.image ? [issue.image] : [];

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{issue.title}</h1>
        <Link to="/feed" className="text-sm text-primary hover:underline">
          ← Back to feed
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <StatusBadge status={issue.status} />
        <SeverityBadge severity={issue.urgency} />
        <span className="badge-pill bg-muted text-muted-foreground">{issue.category}</span>
        <span className={`badge-pill ${rating.color}`}>
          {rating.emoji} {rating.label} · {rating.score}/10
        </span>
      </div>

      {isHeavilyFlagged && !showCensored ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-3" />
          <p className="font-semibold">This content has been flagged for review.</p>
          <button
            onClick={() => setShowCensored(true)}
            className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Show anyway
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6">
            {/* Status Timeline */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-bold mb-6">Status Timeline</h2>
              <ol className="flex justify-between relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted" />
                {LIFECYCLE.map((step) => {
                  const Icon = step.icon;
                  const active = issue.status === step.label;
                  return (
                    <li
                      key={step.label}
                      className="relative flex flex-col items-center text-center w-20 z-10"
                    >
                      <div
                        className={`w-10 h-10 grid place-items-center rounded-full border-2 bg-card ${active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div
                        className={`mt-2 text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {step.label}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Photos */}
            {allPhotos.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold mb-3">Photos ({allPhotos.length})</h2>
                <div
                  className={`grid gap-2 ${allPhotos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  {allPhotos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Photo ${i + 1}`}
                      className="w-full rounded-xl object-cover max-h-[300px]"
                    />
                  ))}
                </div>
                {issue.aiTags && issue.aiTags.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">AI detected:</span>
                    {issue.aiTags.map((t) => (
                      <span key={t} className="badge-pill bg-muted">
                        {t}
                      </span>
                    ))}
                    {issue.aiConfidence != null && (
                      <span className="badge-pill bg-primary text-primary-foreground">
                        {issue.aiConfidence}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{issue.description}</p>
              <p className="text-xs text-muted-foreground mt-4">
                Reported by {issue.reporterAvatar ?? "👤"} {issue.reporterName} ·{" "}
                {timeAgo(issue.createdAt)}
              </p>
            </div>

            {/* Comments */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-4">Comments ({issue.comments.length})</h3>
              {issue.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No comments yet. Be the first!
                </p>
              ) : (
                <ul className="divide-y divide-border mb-4">
                  {issue.comments.map((c) => (
                    <li key={c.id} className="py-3 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted grid place-items-center text-xs font-bold shrink-0 mt-0.5">
                        {c.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{c.userName}</span>
                          <span className="text-[11px] text-muted-foreground">{timeAgo(c.at)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">{c.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {/* Comment input */}
              <div className="flex gap-2 items-center pt-2 border-t border-border">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  maxLength={500}
                />
                <button
                  onClick={handleComment}
                  disabled={!comment.trim()}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                +1 XP per comment · 5s cooldown
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Location */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start gap-2 text-sm mb-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="font-medium break-words">{issue.location}</span>
              </div>
              {issue.lat && issue.lng ? (
                <div className="rounded-lg overflow-hidden border border-border h-36">
                  <iframe
                    title="Report Location"
                    className="w-full h-full"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${issue.lng - 0.01},${issue.lat - 0.01},${issue.lng + 0.01},${issue.lat + 0.01}&layer=mapnik&marker=${issue.lat},${issue.lng}`}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-border h-20 flex items-center justify-center text-xs text-muted-foreground bg-muted/30">
                  No GPS coordinates saved
                </div>
              )}
            </div>

            {/* Vote controls */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold mb-3">Community Vote</p>
              <div className="space-y-2">
                <button
                  onClick={handleUpvote}
                  title={upvoted ? "Remove upvote (−2 XP)" : "Upvote (+2 XP)"}
                  className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors text-sm ${
                    upvoted
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" /> {upvoted ? "Upvoted" : "Upvote"} (
                  {issue.upvotes.length})
                </button>
                <button
                  onClick={handleDownvote}
                  title={downvoted ? "Remove downvote (+2 XP)" : "Downvote (−2 XP)"}
                  className={`w-full py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors text-sm ${
                    downvoted
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" /> {downvoted ? "Downvoted" : "Downvote"} (
                  {(issue.downvotes ?? []).length})
                </button>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Net score:{" "}
                {(() => {
                  const net = issue.upvotes.length - (issue.downvotes?.length ?? 0);
                  return net > 0 ? `+${net}` : net;
                })()}
              </p>
              <p className="text-[10px] text-center text-muted-foreground">
                3s cooldown between votes
              </p>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
