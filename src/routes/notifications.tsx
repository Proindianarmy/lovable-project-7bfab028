import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: () => (
    <AppShell title="Notifications">
      <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
        You're all caught up. 🎉
      </div>
    </AppShell>
  ),
});
