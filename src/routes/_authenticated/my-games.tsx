import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/vibe/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoryLabel } from "@/lib/vibe";

export const Route = createFileRoute("/_authenticated/my-games")({
  head: () => ({
    meta: [
      { title: "My games — Vibe" },
      { name: "description", content: "Every Vibe room you have hosted or joined, with your score in each." },
      { property: "og:title", content: "My games — Vibe" },
      { property: "og:description", content: "Every Vibe room you have hosted or joined, with your score in each." },
    ],
  }),
  component: MyGames,
});

function MyGames() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-games", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_players")
        .select("score, is_host, joined_at, games(id, title, code, category, status)")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell title="My games" subtitle="Every room you've hosted or joined.">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && data.length === 0 && (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          Nothing here yet — create your first room.
        </div>
      )}
      <div className="space-y-2">
        {data?.map((row, i) => {
          const game = row.games;
          if (!game) return null;
          return (
            <Link
              key={`${game.id}-${i}`}
              to="/room/$code"
              params={{ code: game.code }}
              className="press panel flex items-center gap-4 p-4"
            >
              <span className="text-display grid size-11 place-items-center rounded-xl bg-surface-strong text-base">
                {game.code.split("-")[1]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{game.title}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabel(game.category)} · {row.is_host ? "Host" : "Player"} · {game.status}
                </p>
              </div>
              <span className="text-display ml-auto text-2xl">{row.score}</span>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
