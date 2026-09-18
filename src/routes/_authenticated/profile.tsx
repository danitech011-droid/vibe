import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/vibe/app-shell";
import { ThemeToggle } from "@/components/vibe/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { AVATAR_SEEDS, avatarUrl, GAME_STYLES } from "@/lib/vibe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vibe" },
      { name: "description", content: "Edit your Vibe username, avatar, preferred game style and appearance." },
      { property: "og:title", content: "Profile — Vibe" },
      { property: "og:description", content: "Edit your Vibe username, avatar, preferred game style and appearance." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [seed, setSeed] = useState<string>(AVATAR_SEEDS[0] ?? "aurora");
  const [style, setStyle] = useState<string>("friends");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? "");
    setSeed(profile.avatar_seed ?? AVATAR_SEEDS[0] ?? "aurora");
    setStyle(profile.game_style);
  }, [profile]);

  async function save() {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: username.trim(), avatar_seed: seed, game_style: style })
        .eq("id", user!.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Profile" subtitle="Your name, face and default vibe.">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-6 md:col-span-2">
          <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            onClick={save}
            disabled={busy}
            className={cn(
              "press mt-6 w-full rounded-xl bg-citron px-6 py-3.5 text-sm font-semibold text-citron-foreground",
              busy && "opacity-60",
            )}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="panel p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Appearance</p>
            <div className="mt-3">
              <ThemeToggle />
            </div>
          </div>
          <div className="panel space-y-3 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Your stats</p>
            {[
              ["Total points", profile?.total_points ?? 0],
              ["Games played", profile?.games_played ?? 0],
              ["Games won", profile?.games_won ?? 0],
              ["Best score", profile?.best_score ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-display text-2xl">{Number(value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
