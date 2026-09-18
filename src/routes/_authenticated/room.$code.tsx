import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Copy, Crown, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/vibe/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoryLabel, initials } from "@/lib/vibe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/room/$code")({
  head: () => ({
    meta: [
      { title: "Waiting room — Vibe" },
      { name: "description", content: "Share your Vibe game code and watch players join the lobby in real time." },
      { property: "og:title", content: "Waiting room — Vibe" },
      { property: "og:description", content: "Share your Vibe game code and watch players join the lobby in real time." },
    ],
  }),
  errorComponent: () => (
    <AppShell title="Room unavailable">
      <p className="text-sm text-muted-foreground">We couldn't load that room. Check the code and try again.</p>
    </AppShell>
  ),
  component: Room,
});

function Room() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const { data: game, refetch: refetchGame } = useQuery({
    queryKey: ["game", code],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("*").eq("code", code).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: players, refetch: refetchPlayers } = useQuery({
    queryKey: ["players", game?.id],
    enabled: !!game,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_id", game!.id)
        .order("joined_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!game) return;
    const channel = supabase
      .channel(`room-${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${game.id}` },
        () => {
          refetchPlayers();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        () => {
          refetchGame();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [game, refetchPlayers, refetchGame]);

  useEffect(() => {
    if (game?.status === "active") {
      navigate({ to: "/play/$code", params: { code } });
    }
  }, [game?.status, code, navigate]);

  const isHost = game?.host_id === user?.id;

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function start() {
    if (!game) return;
    setStarting(true);
    const { error } = await supabase
      .from("games")
      .update({
        status: "active",
        current_question: 0,
        question_started_at: new Date().toISOString(),
      })
      .eq("id", game.id);
    setStarting(false);
    if (error) {
      toast.error("Could not start the game");
      return;
    }
    router.invalidate();
    navigate({ to: "/play/$code", params: { code } });
  }

  return (
    <AppShell title={game?.title ?? "Waiting room"} subtitle={game ? categoryLabel(game.category) : ""}>
      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
        <div className="panel glow-ring p-6 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Game code</p>
          <p className="text-display mt-3 text-5xl tracking-tight">{code}</p>
          <button
            onClick={copyCode}
            className="press mt-5 inline-flex items-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium"
          >
            {copied ? <Check className="size-4 text-citron" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy code"}
          </button>
          <p className="mt-4 text-sm text-muted-foreground">
            Share it with your people — they join from the Join Game screen.
          </p>
        </div>

        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Users className="size-4" /> Players
            </p>
            <span className="text-display text-2xl">{players?.length ?? 0}</span>
          </div>
          <div className="mt-4 space-y-2">
            {players?.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "animate-pop flex items-center gap-3 rounded-xl border border-hairline px-3 py-2.5",
                  p.user_id === user?.id && "bg-surface-strong",
                )}
              >
                <span className="grid size-8 place-items-center rounded-full bg-surface-strong text-xs font-semibold">
                  {initials(p.display_name)}
                </span>
                <span className="text-sm">{p.display_name}</span>
                {p.is_host && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-citron">
                    <Crown className="size-3.5" /> Host
                  </span>
                )}
              </div>
            ))}
            {(!players || players.length === 0) && (
              <p className="py-6 text-center text-sm text-muted-foreground">Waiting for players…</p>
            )}
          </div>

          {isHost ? (
            <button
              onClick={start}
              disabled={starting}
              className="press glow-ring mt-6 w-full rounded-xl bg-citron px-6 py-3.5 text-base font-semibold text-citron-foreground"
            >
              {starting ? "Starting…" : "Start game"}
            </button>
          ) : (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Hang tight — the host starts the round.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
