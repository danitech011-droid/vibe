import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, PlusCircle, Ticket, Trophy } from "lucide-react";

import { AppShell } from "@/components/vibe/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { categoryLabel } from "@/lib/vibe";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vibe" },
      { name: "description", content: "Your Vibe home: start a challenge, join a room, and track your ranking." },
      { property: "og:title", content: "Dashboard — Vibe" },
      { property: "og:description", content: "Your Vibe home: start a challenge, join a room, and track your ranking." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const { data: recent } = useQuery({
    queryKey: ["recent-games", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_players")
        .select("score, games(id, title, code, category, status, created_at)")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: rank } = useQuery({
    queryKey: ["my-rank", user?.id, profile?.total_points],
    enabled: !!profile,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("total_points", profile!.total_points);
      if (error) throw error;
      return (count ?? 0) + 1;
    },
  });

  return (
    <AppShell
      title={`Hey ${profile?.username ?? "there"}`}
      subtitle="Start something, or jump into a friend's room."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/create" className="press panel glow-ring group p-6">
          <PlusCircle className="size-6 text-citron" />
          <h2 className="text-display mt-8 text-3xl">Create a new challenge</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a category, get a code, invite your people.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
            Start a room <ArrowUpRight className="size-4" />
          </span>
        </Link>

        <Link to="/join" className="press panel group p-6">
          <Ticket className="size-6 text-aqua" />
          <h2 className="text-display mt-8 text-3xl">Join a friend's game</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Got a code like VIBE-4829? Drop it in and play.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
            Enter a code <ArrowUpRight className="size-4" />
          </span>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          ["Total points", (profile?.total_points ?? 0).toLocaleString()],
          ["Games won", String(profile?.games_won ?? 0)],
          ["Global rank", rank ? `#${rank}` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="panel p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="text-display mt-2 text-4xl">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-display text-2xl">Recent games</h2>
          <Link to="/my-games" className="text-sm text-muted-foreground hover:text-foreground">
            See all
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((row, i) => {
              const game = row.games;
              if (!game) return null;
              return (
                <Link
                  key={`${game.id}-${i}`}
                  to="/room/$code"
                  params={{ code: game.code }}
                  className="press panel flex items-center gap-4 p-4"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-strong text-xs font-semibold">
                    {game.code.split("-")[1]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{game.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabel(game.category)} · {game.status}
                    </p>
                  </div>
                  <span className="text-display ml-auto text-xl">{row.score}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="panel p-8 text-center">
            <Trophy className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No games yet. Create your first room and see who really knows you.
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
