import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — IssueSnap" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const top: any[] = [];

  return (
    <AppShell title="Community Leaderboard">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl">
        {top.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <Users className="w-14 h-14 mb-4 opacity-25" />
            <p className="text-lg font-semibold">No contributors yet.</p>
            <p className="text-sm mt-1 max-w-xs">
              The leaderboard will populate once citizens start reporting and resolving issues.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {top.map((user, i) => (
              <li key={user._id} className="py-3 flex items-center gap-4">
                <span className="w-8 h-8 grid place-items-center rounded-full bg-muted font-bold text-sm">
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-full bg-muted border border-border" />
                <div className="flex-1">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.contributionScore} Points</div>
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <Trophy className="w-4 h-4 text-warning" /> {user.contributionScore}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
