import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { Inbox, PlusCircle, Trophy } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { useAuth, useReports, levelFor, timeAgo, computeRating } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Issue Dashboard — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { reports } = useReports();
  if (!user) return null;

  const mine = reports.filter((r) => r.reporterId === user.id);
  const recent = reports.slice(0, 6);
  const lvl = levelFor(user.points);

  return (
    <AppShell title={`Welcome back, ${user.name}`}>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="My Reports" className="lg:col-span-2">
          {mine.length === 0 ? (
            <Empty message="You haven't submitted any reports yet.">
              <Link to="/report" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
                <PlusCircle className="w-4 h-4" /> Report your first issue
              </Link>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {mine.slice(0, 8).map((r) => {
                const rating = computeRating(r);
                return (
                  <li key={r.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Link to="/issue/$id" params={{ id: r.id }} className="font-medium truncate hover:underline">
                        {r.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">{r.category} · {timeAgo(r.createdAt)}</div>
                    </div>
                    <span className={`badge-pill ${rating.color}`}>{rating.emoji} {rating.score}/10</span>
                    <StatusBadge status={r.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Your Score">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">{user.points}</span>
            <span className="text-muted-foreground text-sm">pts</span>
          </div>
          <p className="text-sm font-medium mt-1">{lvl.level.name}</p>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${lvl.progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {lvl.next ? `${lvl.next.min - user.points} pts to ${lvl.next.name}` : "Max level reached!"}
          </p>
          <Link to="/leaderboard" className="mt-4 flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Trophy className="w-4 h-4" /> View leaderboard
          </Link>
        </Card>

        <Card title="Recent Community Activity" className="lg:col-span-3">
          {recent.length === 0 ? (
            <Empty message="No activity yet. Submit a report to get things started." />
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recent.map((r) => (
                <Link
                  to="/issue/$id"
                  params={{ id: r.id }}
                  key={r.id}
                  className="block rounded-xl border border-border p-4 hover:bg-muted/40"
                >
                  <p className="font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.category} · {timeAgo(r.createdAt)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">{r.upvotes.length} upvotes</span>
                  </div>
                </Link>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Empty({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
      <Inbox className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
      {children}
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-card border border-border rounded-2xl p-6 shadow-sm ${className}`}>
      <h2 className="font-bold text-lg mb-4">{title}</h2>
      {children}
    </section>
  );
}
