import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { MessageSquare, MoreHorizontal, Inbox } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Issue Dashboard — IssueSnap" }] }),
  component: Dashboard,
});

function Dashboard() {
  const myReports: any[] = [];
  const recentActivity: any[] = [];

  return (
    <AppShell title="Issue Dashboard">
      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="My Reports" className="lg:col-span-2">
          {myReports.length === 0 ? (
            <EmptyState message="You haven't submitted any reports yet." />
          ) : (
            <ul className="divide-y divide-border">
              {myReports.map((r) => (
                <li key={r._id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.createdAt}</div>
                  </div>
                  <StatusBadge status={r.status} />
                  <button className="w-9 h-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Contribution Score">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">0</span>
            <span className="text-muted-foreground text-sm">Points</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-0 bg-primary rounded-full" />
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Submit your first report to start earning points and unlocking badges.
          </p>
        </Card>

        <Card title="Recent Activity" className="lg:col-span-3">
          {recentActivity.length === 0 ? (
            <EmptyState message="No activity yet. Updates will appear here once issues are reported or actioned." />
          ) : (
            <ul className="space-y-4">
              {recentActivity.map((a, i) => (
                <li key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{a.who}</span> {a.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.when}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
      <Inbox className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-card border border-border rounded-2xl p-6 shadow-sm ${className}`}>
      <header className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">{title}</h2>
        <button className="text-muted-foreground"><MoreHorizontal className="w-5 h-5" /></button>
      </header>
      {children}
    </section>
  );
}
