import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/vibe/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({
    meta: [
      { title: "Join a game — Vibe" },
      { name: "description", content: "Enter a Vibe game code and your nickname to jump into a live quiz room." },
      { property: "og:title", content: "Join a game — Vibe" },
      { property: "og:description", content: "Enter a Vibe game code and your nickname to jump into a live quiz room." },
    ],
  }),
  component: JoinGame,
});

function normalise(input: string) {
  const digits = input.toUpperCase().replace(/[^0-9]/g, "").slice(0, 4);
  return digits ? `VIBE-${digits}` : "";
}

function JoinGame() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  async function join() {
    const full = normalise(code);
    if (!full) {
      toast.error("Enter the 4 digits from the game code");
      return;
    }

    setBusy(true);
    try {
      const { data: game, error } = await supabase
        .from("games")
        .select("*")
        .eq("code", full)
        .maybeSingle();
      if (error) throw error;
      if (!game) {
        toast.error("No room found with that code");
        return;
      }

      const { error: joinError } = await supabase.from("game_players").upsert(
        {
          game_id: game.id,
          user_id: user!.id,
          display_name: name.trim() || profile?.username || "Player",
          is_host: game.host_id === user!.id,
        },
        { onConflict: "game_id,user_id" },
      );
      if (joinError) throw joinError;

      navigate({ to: "/room/$code", params: { code: game.code } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join that room");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Join a game" subtitle="Ask the host for their code.">
      <div className="panel mx-auto max-w-md p-6 md:p-8">
        <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Game code
        </label>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
          <span className="text-display text-2xl text-muted-foreground">VIBE-</span>
          <input
            value={code}
            inputMode="numeric"
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="4829"
            className="text-display w-full bg-transparent text-2xl tracking-[0.2em] outline-none"
          />
        </div>

        <label className="mt-5 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Your nickname
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={profile?.username ?? "Player"}
          className="mt-2 w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <button
          onClick={join}
          disabled={busy}
          className={cn(
            "press glow-ring mt-6 w-full rounded-xl bg-citron px-6 py-3.5 text-base font-semibold text-citron-foreground",
            busy && "opacity-60",
          )}
        >
          {busy ? "Finding the room…" : "Join room"}
        </button>
      </div>
    </AppShell>
  );
}
