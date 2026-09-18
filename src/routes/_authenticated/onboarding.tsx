import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Atmosphere } from "@/components/vibe/atmosphere";
import { VibeLogo } from "@/components/vibe/logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { AVATAR_SEEDS, avatarUrl, GAME_STYLES } from "@/lib/vibe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — Vibe" },
      { name: "description", content: "Pick your username, avatar and preferred game style to finish setting up Vibe." },
      { property: "og:title", content: "Set up your profile — Vibe" },
      { property: "og:description", content: "Pick your username, avatar and preferred game style to finish setting up Vibe." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [seed, setSeed] = useState<string>(AVATAR_SEEDS[0] ?? "aurora");
  const [style, setStyle] = useState<string>("friends");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
  }, [profile]);

  async function finish() {
    if (!username.trim()) {
      toast.error("Pick a username");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          avatar_seed: seed,
          game_style: style,
          onboarded: true,
        })
        .eq("id", user!.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background px-5 py-10">
      <Atmosphere />
      <div className="relative mx-auto w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <VibeLogo />
        </div>
        <div className="panel p-6 md:p-8">
          <h1 className="text-display text-3xl">Set up your vibe</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This is how your people will see you on the leaderboard.
          </p>

          <label className="mt-6 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="mara"
            className="mt-2 w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Avatar</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AVATAR_SEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSeed(s)}
                className={cn(
                  "press size-12 overflow-hidden rounded-full border-2",
                  seed === s ? "border-citron" : "border-transparent",
                )}
              >
                <img src={avatarUrl(s)} alt={s} className="size-full" />
              </button>
            ))}
          </div>

          <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Preferred game style
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {GAME_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "press rounded-xl border border-hairline p-4 text-left",
                  style === s.id ? "bg-citron text-citron-foreground" : "bg-surface",
                )}
              >
                <p className="text-sm font-semibold">{s.label}</p>
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    style === s.id ? "opacity-75" : "text-muted-foreground",
                  )}
                >
                  {s.blurb}
                </p>
              </button>
            ))}
          </div>

          <button
            onClick={finish}
            disabled={busy}
            className={cn(
              "press glow-ring mt-7 w-full rounded-xl bg-citron px-6 py-3.5 text-base font-semibold text-citron-foreground",
              busy && "opacity-60",
            )}
          >
            {busy ? "Saving…" : "Enter Vibe"}
          </button>
        </div>
      </div>
    </div>
  );
}
