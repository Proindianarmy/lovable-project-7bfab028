import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusBadge, SeverityBadge } from "@/components/AppShell";
import { ChevronDown, LayoutGrid, List, MapPin, Inbox } from "lucide-react";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Community Feed — IssueSnap" }] }),
  component: Feed,
});

function Feed() {
  const issues: any[] = [];

  return (
    <AppShell>
      <div className="flex justify-end mb-4">
        <Link
          to="/report"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          + New Issue
        </Link>
      </div>
      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="bg-card border border-border rounded-2xl p-5 h-fit sticky top-6">
          <h2 className="font-bold text-lg mb-4">Filters</h2>
          <FilterGroup title="Category" items={["Infrastructure", "Environment", "Safety", "Public Services"]} />
          <FilterGroup title="Date" items={["Last 7 Days", "This Month", "Custom Range"]} plain />
          <div className="py-3 border-t border-border">
            <h3 className="font-semibold mb-2 flex items-center justify-between">
              Location <ChevronDown className="w-4 h-4" />
            </h3>
            <button className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" /> Neighbourhood / District
            </button>
          </div>
          <FilterGroup title="Severity" items={["High", "Medium", "Low"]} />
        </aside>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Issue Feed — All Active Issues</h1>
            <div className="flex items-center gap-2 text-sm">
              <button className="px-3 py-1.5 rounded-md bg-muted">Newest</button>
              <button className="px-3 py-1.5 rounded-md">Most Supported</button>
              <button className="px-3 py-1.5 rounded-md border border-border flex items-center gap-1">
                Status <ChevronDown className="w-3 h-3" />
              </button>
              <div className="ml-2 flex border border-border rounded-md overflow-hidden">
                <button className="p-1.5 bg-muted"><LayoutGrid className="w-4 h-4" /></button>
                <button className="p-1.5"><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground bg-card border border-border rounded-2xl">
              <Inbox className="w-14 h-14 mb-4 opacity-30" />
              <p className="text-lg font-semibold">No active issues have been logged yet.</p>
              <p className="text-sm mt-1 max-w-xs">
                Be the first to report a civic issue in your community.
              </p>
              <Link
                to="/report"
                className="mt-5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Report an Issue
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((i) => (
                <Link
                  key={i._id}
                  to="/issue/$id"
                  params={{ id: i._id }}
                  className="flex items-center gap-4 bg-card border border-border rounded-2xl p-3 hover:shadow-md transition-shadow"
                >
                  <img
                    src={i.images?.[0] ?? ""}
                    alt=""
                    className="w-24 h-20 rounded-lg object-cover bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{i.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      #{i._id?.slice(-6)} opened by {i.reporter?.name}
                    </p>
                  </div>
                  <StatusBadge status={i.status} />
                  <SeverityBadge severity={i.severity} />
                  <div className="text-right pl-2">
                    <div className="text-xl font-bold">{i.supporters?.length ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Supporters</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function FilterGroup({ title, items, plain = false }: { title: string; items: string[]; plain?: boolean }) {
  return (
    <div className="py-3 border-t border-border first:border-t-0">
      <h3 className="font-semibold mb-2 flex items-center justify-between">
        {title} <ChevronDown className="w-4 h-4" />
      </h3>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2">
            {!plain && <input type="checkbox" className="rounded border-border" />}
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
