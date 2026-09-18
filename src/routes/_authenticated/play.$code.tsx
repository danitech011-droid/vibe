import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/vibe/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { initials, scoreFor } from "@/lib/vibe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/play/$code")({
  head: () => ({
    meta: [
      { title: "Live round — Vibe" },
      { name: "description", content: "Answer against the clock and watch the leaderboard move in real time." },
      { property: "og:title", content: "Live round — Vibe" },
      { property: "og:description", content: "Answer against the clock and watch the leaderboard move in real time." },
    ],
  }),
  errorComponent: () => (
    <AppShell title="Round unavailable">
      <p className="text-sm text-muted-foreground">That round could not be loaded.</p>
    </AppShell>
  ),
  component: Play,
});

const ROUND_MS = 15000;
const REVEAL_MS = 2500;
const TONES = ["bg-option-a", "bg-option-b", "bg-option-c", "bg-option-d"];

function Play() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [gained, setGained] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const advancingRef = useRef<number | null>(null);
  const recordedRef = useRef(false);

  const { data: game } = useQuery({
    queryKey: ["game", code],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("*").eq("code", code).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["questions", game?.id],
    enabled: !!game,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_questions")
        .select("*")
        .eq("game_id", game!.id)
        .order("position");
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
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const gameId = game?.id;

  // Live sync: the host drives the question index, everyone follows.
  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`play-${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          queryClient.setQueryData(["game", code], payload.new);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` },
        () => {
          refetchPlayers();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, code, queryClient, refetchPlayers]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const index = game?.current_question ?? 0;
  const isHost = !!game && !!user && game.host_id === user.id;
  const finished = game?.status === "finished";
  const startedAt = game?.question_started_at ? Date.parse(game.question_started_at) : null;
  const elapsed = startedAt ? now - startedAt : 0;
  const msLeft = startedAt ? Math.max(ROUND_MS - elapsed, 0) : ROUND_MS;

  const question = questions?.[index];
  const options = useMemo(() => {
    const raw = question?.options;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [question]);

  // New question: clear the local answer state.
  useEffect(() => {
    setPicked(null);
    setGained(0);
  }, [index]);

  // Host kicks off the clock for the current question.
  useEffect(() => {
    if (!isHost || !game || finished || game.question_started_at) return;
    supabase
      .from("games")
      .update({ question_started_at: new Date().toISOString(), status: "active" })
      .eq("id", game.id);
  }, [isHost, game, finished]);

  // Host moves everyone to the next question after the reveal.
  useEffect(() => {
    if (!isHost || !game || !questions || finished || !startedAt) return;
    if (elapsed < ROUND_MS + REVEAL_MS) return;
    if (advancingRef.current === index) return;
    advancingRef.current = index;
    const last = index + 1 >= questions.length;
    supabase
      .from("games")
      .update(
        last
          ? { status: "finished" }
          : { current_question: index + 1, question_started_at: new Date().toISOString() },
      )
      .eq("id", game.id);
  }, [isHost, game, questions, finished, startedAt, elapsed, index]);

  // Everyone records their own result once the game is over.
  useEffect(() => {
    if (!finished || !game || !user || recordedRef.current) return;
    recordedRef.current = true;
    (async () => {
      const { data: top } = await supabase
        .from("game_players")
        .select("user_id, score")
        .eq("game_id", game.id)
        .order("score", { ascending: false })
        .limit(1);
      await supabase.rpc("record_game_result", {
        p_game_id: game.id,
        p_score: score,
        p_won: top?.[0]?.user_id === user.id,
      });
      refetchPlayers();
    })();
  }, [finished, game, user, score, refetchPlayers]);

  const revealed = picked !== null || msLeft <= 0;

  async function choose(i: number) {
    if (picked !== null || msLeft <= 0 || !question || !game || !user) return;
    setPicked(i);
    if (i !== question.correct_index) return;
    const points = scoreFor(msLeft, ROUND_MS);
    const next = score + points;
    setGained(points);
    setScore(next);
    await supabase.from("game_players").upsert(
      {
        game_id: game.id,
        user_id: user.id,
        display_name: profile?.username ?? "Player",
        score: next,
        is_host: game.host_id === user.id,
      },
      { onConflict: "game_id,user_id" },
    );
  }

  const ranked = players ?? [];
  const progress = questions?.length ? ((index + (revealed ? 1 : 0)) / questions.length) * 100 : 0;


  if (finished) {
    const winner = ranked[0];
    return (
      <AppShell title="Round over" subtitle={game?.title ?? ""}>
        <div className="panel glow-ring p-8 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your score</p>
          <p className="text-display animate-pop mt-2 text-6xl">{score.toLocaleString()}</p>
          {winner && (
            <p className="mt-3 text-sm text-muted-foreground">
              Top of the room: {winner.display_name} with {winner.score.toLocaleString()}
            </p>
          )}
        </div>

        <div className="panel mt-4 divide-y divide-hairline overflow-hidden">
          {ranked.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4 px-4 py-3">
              <span
                className={cn(
                  "text-display grid size-8 place-items-center rounded-full text-sm",
                  i === 0 ? "bg-citron text-citron-foreground" : "bg-surface-strong",
                )}
              >
                {i + 1}
              </span>
              <span className="text-sm">{p.display_name}</span>
              <span className="text-display ml-auto text-xl">{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/dashboard"
            className="press flex-1 rounded-xl border border-hairline px-6 py-3.5 text-center text-sm font-semibold"
          >
            Back to dashboard
          </Link>
          <button
            onClick={() => navigate({ to: "/create" })}
            className="press glow-ring flex-1 rounded-xl bg-citron px-6 py-3.5 text-sm font-semibold text-citron-foreground"
          >
            Run another round
          </button>
        </div>
      </AppShell>
    );
  }

  if (!question) {
    return (
      <AppShell title="Getting the round ready…">
        <p className="text-sm text-muted-foreground">Loading questions…</p>
      </AppShell>
    );
  }

  const seconds = Math.ceil(msLeft / 1000);
  const ring = (msLeft / ROUND_MS) * 100;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-strong">
          <div
            className="h-full rounded-full bg-citron transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="panel p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Question {index + 1} / {questions?.length ?? 0}
              </span>
              <h2 className="text-display mt-2 text-3xl leading-tight">{question.prompt}</h2>
            </div>
            <div className="relative grid size-14 shrink-0 place-items-center">
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(var(--citron) 0 ${ring}%, var(--hairline) 0)` }}
              />
              <span className="absolute inset-[3px] rounded-full bg-background" />
              <span className="text-display relative text-xl leading-none">{seconds}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {options.map((option, i) => {
              const isCorrect = i === question.correct_index;
              
              return (
                <button
                  key={`${option}-${i}`}
                  onClick={() => choose(i)}
                  disabled={revealed}
                  className={cn(
                    "press rounded-2xl px-4 py-5 text-left text-base font-semibold text-option-ink transition-all duration-300",
                    TONES[i % 4],
                    revealed && !isCorrect && "opacity-30",
                    revealed && isCorrect && "ring-2 ring-foreground/50",
                    picked === i && !isCorrect && "ring-2 ring-destructive",
                  )}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="animate-pop mt-5 rounded-xl border border-hairline px-4 py-3 text-center">
              {picked === question.correct_index ? (
                <p className="text-sm font-medium">
                  Correct — <span className="text-citron">+{gained}</span> points
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {picked === null ? "Time's up." : "Not this time."} The answer was{" "}
                  {options[question.correct_index]}.
                </p>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between rounded-xl border border-hairline px-4 py-3">
            <span className="text-xs text-muted-foreground">Your score</span>
            <span key={score} className="animate-pop text-display text-2xl leading-none">
              {score.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="panel mt-4 p-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Live standings
          </p>
          <div className="space-y-2">
            {ranked.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                <span className="grid size-7 place-items-center rounded-full bg-surface-strong text-[10px] font-semibold">
                  {initials(p.display_name)}
                </span>
                <span className="text-sm">{p.display_name}</span>
                <span className="text-display ml-auto text-base">
                  {(p.user_id === user?.id ? score : p.score).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
