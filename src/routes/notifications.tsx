import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useNotifications, timeAgo } from "@/lib/store";
import { Bell, CheckCheck, X } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { notifications, markRead, markAllRead, unread } = useNotifications();
  const t = useT();
  // Track dismissed notification ids so user can X them away
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  const dismiss = (id: string) => {
    markRead(id);
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <AppShell title={t("notificationsTitle")}>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-muted-foreground">{unread} unread</span>
          <button
            onClick={markAllRead}
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        </div>
        {visible.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <p>No notifications yet.</p>
          </div>
        ) : (
          visible.map((n) => (
            <div
              key={n.id}
              className={`w-full text-left px-5 py-4 hover:bg-muted/40 flex items-start gap-3 ${!n.read ? "bg-primary/5" : ""}`}
            >
              <button
                onClick={() => markRead(n.id)}
                className="w-9 h-9 rounded-full bg-muted grid place-items-center shrink-0"
              >
                <Bell className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0" onClick={() => markRead(n.id)} role="button">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2" />}
                <button
                  onClick={() => dismiss(n.id)}
                  className="w-6 h-6 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
