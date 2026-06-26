import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AppShell, StatusBadge, SeverityBadge } from "@/components/AppShell";
import { Inbox, ThumbsUp, ThumbsDown, MessageCircle, Flag, MapPin, X, Search } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useMemo, useRef, useState } from "react";
import {
  CATEGORIES, type Category, type IssueStatus, type Urgency,
  useReports, useAuth, computeRating, timeAgo,
} from "@/lib/store";
import { toast } from "sonner";

type SortBy = "newest" | "upvoted" | "critical" | "rating";
type DateRange = "all" | "today" | "week" | "month";

interface FeedSearch {
  category?: Category | "";
  status?: IssueStatus | "";
  urgency?: Urgency | "";
  range?: DateRange;
  q?: string;
  sort?: SortBy;
}

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Community Feed — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  validateSearch: (s: Record<string, unknown>): FeedSearch => ({
    category: (s.category as Category | "") || "",
    status: (s.status as IssueStatus | "") || "",
    urgency: (s.urgency as Urgency | "") || "",
    range: (s.range as DateRange) || "all",
    q: (s.q as string) || "",
    sort: (s.sort as SortBy) || "newest",
  }),
  component: Feed,
});

function Feed() {
  const search = useSearch({ from: "/feed" });
  const navigate = Route.useNavigate();
  const { reports, upvote, downvote, flagSpam } = useReports();
  const { user, addPoints } = useAuth();

  // Per-report vote cooldown tracking — prevent spam clicking
  const voteCooldowns = useRef<Record<string, number>>({});
  const COOLDOWN_MS = 1000;

  const setParam = (patch: Partial<FeedSearch>) => {
    navigate({ search: (prev: FeedSearch) => ({ ...prev, ...patch }) });
  };

  const filtered = useMemo(() => {
    let list = reports.slice();
    if (search.category) list = list.filter((r) => r.category === search.category);
    if (search.status) list = list.filter((r) => r.status === search.status);
    if (search.urgency) list = list.filter((r) => r.urgency === search.urgency);
    if (search.range && search.range !== "all") {
      const now = Date.now();
      const cutoff =
        search.range === "today" ? now - 86400000 :
        search.range === "week" ? now - 7 * 86400000 :
        now - 30 * 86400000;
      list = list.filter((r) => r.createdAt >= cutoff);
    }
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter((r) =>
        r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
      );
    }
    const sort = search.sort || "newest";
    list.sort((a, b) => {
      if (sort === "upvoted") return b.upvotes.length - a.upvotes.length;
      if (sort === "critical") {
        const order: Record<Urgency, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return order[b.urgency] - order[a.urgency];
      }
      if (sort === "rating") return computeRating(b).score - computeRating(a).score;
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [reports, search]);

  const activeChips: { label: string; clear: () => void }[] = [];
  if (search.category) activeChips.push({ label: `Category: ${search.category}`, clear: () => setParam({ category: "" }) });
  if (search.status) activeChips.push({ label: `Status: ${search.status}`, clear: () => setParam({ status: "" }) });
  if (search.urgency) activeChips.push({ label: `Urgency: ${search.urgency}`, clear: () => setParam({ urgency: "" }) });
  if (search.range && search.range !== "all") activeChips.push({ label: `Range: ${search.range}`, clear: () => setParam({ range: "all" }) });
  if (search.q) activeChips.push({ label: `Search: "${search.q}"`, clear: () => setParam({ q: "" }) });

  const handleUpvote = (reportId: string, isUpvoted: boolean) => {
    if (!user) return;
    const key = `up_${reportId}`;
    const now = Date.now();
    if (now - (voteCooldowns.current[key] ?? 0) < COOLDOWN_MS) return;
    voteCooldowns.current[key] = now;

    const { wasUpvoted, wasDownvoted } = upvote(reportId, user.id);
    if (wasUpvoted) {
      // un-liking: revert +2 XP
      addPoints(-2, "Removed upvote");
    } else {
      if (wasDownvoted) {
        // switching from downvote to upvote: +2 + revert -2 = +4
        addPoints(4, "Changed vote to upvote");
      } else {
        addPoints(2, "Upvoted an issue");
      }
    }
  };

  const handleDownvote = (reportId: string) => {
    if (!user) return;
    const key = `dn_${reportId}`;
    const now = Date.now();
    if (now - (voteCooldowns.current[key] ?? 0) < COOLDOWN_MS) return;
    voteCooldowns.current[key] = now;

    const { wasDownvoted, wasUpvoted } = downvote(reportId, user.id);
    if (wasDownvoted) {
      // un-downvoting: revert -2
      addPoints(2, "Removed downvote");
    } else {
      if (wasUpvoted) {
        // switching from upvote to downvote: -2 - revert +2 = -4
        addPoints(-4, "Changed vote to downvote");
      } else {
        addPoints(-2, "Downvoted an issue");
      }
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Issue Feed</h1>
        <Link to="/report"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          + New Issue
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="grid md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search.q} onChange={(e) => setParam({ q: e.target.value })}
              placeholder="Search title or description..."
              className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-background text-sm" />
          </div>
          <Select value={search.category || ""} onChange={(v) => setParam({ category: v as Category | "" })}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={search.status || ""} onChange={(v) => setParam({ status: v as IssueStatus | "" })}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </Select>
          <Select value={search.urgency || ""} onChange={(v) => setParam({ urgency: v as Urgency | "" })}>
            <option value="">All Urgency</option>
            {(["Low", "Medium", "High", "Critical"] as Urgency[]).map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">Date:</span>
          {(["all", "today", "week", "month"] as DateRange[]).map((r) => (
            <button key={r} onClick={() => setParam({ range: r })}
              className={`px-3 py-1 rounded-full text-xs ${(search.range || "all") === r ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {r === "all" ? "All Time" : r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-4">Sort:</span>
          {(["newest", "upvoted", "critical", "rating"] as SortBy[]).map((s) => (
            <button key={s} onClick={() => setParam({ sort: s })}
              className={`px-3 py-1 rounded-full text-xs ${(search.sort || "newest") === s ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {s === "newest" ? "Newest" : s === "upvoted" ? "Most Upvoted" : s === "critical" ? "Most Critical" : "Auto Rating"}
            </button>
          ))}
        </div>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            {activeChips.map((c) => (
              <button key={c.label} onClick={c.clear}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs">
                {c.label} <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground bg-card border border-border rounded-2xl">
          <Inbox className="w-14 h-14 mb-4 opacity-30" />
          <p className="text-lg font-semibold">No issues match your filters.</p>
          <Link to="/report"
            className="mt-5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Report an Issue
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const rating = computeRating(r);
            const upvoted = user ? r.upvotes.includes(user.id) : false;
            const downvoted = user ? (r.downvotes ?? []).includes(user.id) : false;
            const netVotes = r.upvotes.length - (r.downvotes?.length ?? 0);
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {r.image && (
                    <img src={r.image} alt="" className="w-28 h-24 rounded-lg object-cover bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Link to="/issue/$id" params={{ id: r.id }} className="font-semibold hover:underline truncate">
                        {r.title}
                      </Link>
                      <span className={`badge-pill ${rating.color}`}>{rating.emoji} {rating.label} · {rating.score}/10</span>
                      <StatusBadge status={r.status} />
                      <SeverityBadge severity={r.urgency} />
                      <span className="badge-pill bg-muted text-muted-foreground">{r.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{r.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location}</span>
                      <span>· {timeAgo(r.createdAt)}</span>
                      <span>· {r.reporterAvatar ?? "👤"} {r.reporterName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  {/* Upvote */}
                  <button
                    onClick={() => handleUpvote(r.id, upvoted)}
                    title={upvoted ? "Remove upvote (−2 XP)" : "Upvote (+2 XP)"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      upvoted ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{r.upvotes.length}</span>
                  </button>
                  {/* Downvote */}
                  <button
                    onClick={() => handleDownvote(r.id)}
                    title={downvoted ? "Remove downvote (+2 XP)" : "Downvote (−2 XP)"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      downvoted ? "bg-destructive text-destructive-foreground" : "bg-muted hover:bg-muted/70"
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>{(r.downvotes ?? []).length}</span>
                  </button>
                  {/* Net score */}
                  <span className={`text-xs font-semibold px-2 ${netVotes >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {netVotes > 0 ? `+${netVotes}` : netVotes}
                  </span>
                  <Link to="/issue/$id" params={{ id: r.id }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70 text-sm">
                    <MessageCircle className="w-4 h-4" /> {r.comments.length}
                  </Link>
                  <button
                    onClick={() => {
                      if (!user) return;
                      flagSpam(r.id, user.id);
                      toast.success("Report flagged for review.");
                    }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted"
                  >
                    <Flag className="w-3.5 h-3.5" /> Spam ({r.spamFlags.length})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-10 px-3 rounded-md border border-border bg-background text-sm">
      {children}
    </select>
  );
}