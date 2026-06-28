import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useReports, useAuth, levelFor } from "@/lib/store";
import { Trophy, Medal } from "lucide-react";
import { useMemo } from "react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: Leaderboard,
});

/** Render an avatar safely — never dumps raw data URLs as text */
function Avatar({ src, name }: { src?: string; name: string }) {
  if (src && src.startsWith("data:")) {
    return (
      <img
        src={src}
        alt={name}
        className="w-10 h-10 rounded-full object-cover border border-border"
      />
    );
  }
  if (src && !src.startsWith("data:") && src.length <= 8) {
    // It's an emoji
    return (
      <div className="w-10 h-10 rounded-full bg-muted grid place-items-center text-xl border border-border">
        {src}
      </div>
    );
  }
  // Fallback: initials
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold border border-border">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Leaderboard() {
  const { reports } = useReports();
  const { user } = useAuth();

  const board = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        avatar?: string;
        reports: number;
        upvotes: number;
        points: number;
      }
    >();

    reports.forEach((r) => {
      const cur = map.get(r.reporterId) ?? {
        name: r.reporterName,
        avatar: r.reporterAvatar,
        reports: 0,
        upvotes: 0,
        points: 0,
      };
      cur.reports += 1;
      cur.upvotes += r.upvotes.length;
      cur.points += 10 + r.upvotes.length * 2 + (r.status === "Resolved" ? 50 : 0);
      map.set(r.reporterId, cur);
    });

    // Merge current user's live data
    if (user) {
      const cur = map.get(user.id) ?? {
        name: user.name,
        avatar: user.avatar,
        reports: 0,
        upvotes: 0,
        points: 0,
      };
      cur.points = Math.max(cur.points, user.points);
      cur.avatar = user.avatar; // always use latest avatar
      cur.name = user.name;
      map.set(user.id, cur);
    }

    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);
  }, [reports, user]);

  return (
    <AppShell title="Leaderboard">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="font-semibold">Top Civic Contributors</h2>
        </div>

        {board.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">
            No contributors yet — be the first!
          </p>
        ) : (
          <ul>
            {board.map((u, i) => {
              const lvl = levelFor(u.points);
              const isMe = user?.id === u.id;
              return (
                <li
                  key={u.id}
                  className={`flex items-center gap-4 px-6 py-3 border-b border-border last:border-0 ${
                    isMe ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center font-bold text-lg shrink-0">
                    {i === 0 ? (
                      <Medal className="w-6 h-6 text-yellow-500" />
                    ) : i === 1 ? (
                      <Medal className="w-6 h-6 text-gray-400" />
                    ) : i === 2 ? (
                      <Medal className="w-6 h-6 text-orange-600" />
                    ) : (
                      <span className="text-sm text-muted-foreground">#{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar — safe render */}
                  <Avatar src={u.avatar} name={u.name} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {u.name}
                      {isMe && (
                        <span className="ml-1.5 text-xs text-primary font-normal">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lvl.level.name} · {u.reports} reports · {u.upvotes} upvotes
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <div className="font-bold text-primary">{u.points}</div>
                    <div className="text-xs text-muted-foreground">points</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
