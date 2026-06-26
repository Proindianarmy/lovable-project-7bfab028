import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useNotifications, timeAgo } from "@/lib/store";
import { Bell, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { notifications, markRead, markAllRead, unread } = useNotifications();
  return (
    <AppShell title="Notifications">
      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-muted-foreground">{unread} unread</span>
          <button onClick={markAllRead} className="text-sm text-primary flex items-center gap-1 hover:underline">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        </div>
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <p>No notifications yet.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left px-5 py-4 hover:bg-muted/40 flex items-start gap-3 ${!n.read ? "bg-primary/5" : ""}`}
            >
              <div className="w-9 h-9 rounded-full bg-muted grid place-items-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.at)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2" />}
            </button>
          ))
        )}
      </div>
    </AppShell>
  );
}
