import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/vibe/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { avatarUrl, initials } from "@/lib/vibe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Vibe" },
      { name: "description", content: "Global Vibe rankings: total points, games won and best scores." },
      { property: "og:title", content: "Leaderboard — Vibe" },
      { property: "og:description", content: "Global Vibe rankings: total points, games won and best scores." },
    ],
  }),
  component: Leaderboard,
});

const MEDALS = ["bg-citron text-citron-foreground", "bg-aqua text-option-ink", "bg-amber text-option-ink"];

function Leaderboard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_seed, total_points, games_won, best_score")
        .order("total_points", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const podium = data?.slice(0, 3) ?? [];

  return (
    <AppShell title="Leaderboard" subtitle="Points, wins and personal bests across every room.">
      {podium.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {podium.map((p, i) => (
            <div key={p.id} className={cn("panel p-5", i === 0 && "glow-ring")}>
              <span
                className={cn(
                  "text-display grid size-9 place-items-center rounded-full text-lg",
                  MEDALS[i],
                )}
              >
                {i + 1}
              </span>
              <p className="mt-4 truncate text-sm font-medium">{p.username ?? "Player"}</p>
              <p className="text-display text-3xl">{p.total_points.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.games_won} wins · best {p.best_score}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="panel divide-y divide-hairline overflow-hidden">
        {data?.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              "flex items-center gap-4 px-4 py-3",
              p.id === user?.id && "bg-surface-strong",
            )}
          >
            <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-hairline text-xs font-semibold">
              {p.avatar_seed ? (
                <img src={avatarUrl(p.avatar_seed)} alt="" className="size-full" />
              ) : (
                initials(p.username)
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.username ?? "Player"}</p>
              <p className="text-xs text-muted-foreground">
                {p.games_won} wins · best {p.best_score}
              </p>
            </div>
            <span className="text-display ml-auto text-xl">{p.total_points.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
