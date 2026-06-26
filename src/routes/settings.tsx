import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — IssueSnap" }] }),
  component: () => (
    <AppShell title="Settings">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-xl space-y-4">
        <Toggle label="Email notifications" />
        <Toggle label="Push notifications" />
        <Toggle label="Weekly community digest" />
        <Toggle label="Show me on the leaderboard" defaultOn />
      </div>
    </AppShell>
  ),
});

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  return (
    <label className="flex items-center justify-between py-2">
      <span>{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="w-10 h-6" />
    </label>
  );
}
