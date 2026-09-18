import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Activity, Gamepad2, ListChecks, ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/vibe/app-shell";
import { getAdminOverview, setUserRole } from "@/lib/admin.functions";
import { categoryLabel, initials } from "@/lib/vibe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Vibe" },
      { name: "description", content: "Platform overview: players, games, questions and activity across Vibe." },
      { property: "og:title", content: "Admin — Vibe" },
      { property: "og:description", content: "Platform overview: players, games, questions and activity across Vibe." },
    ],
  }),
  errorComponent: () => (
    <AppShell title="Admin">
      <p className="text-sm text-muted-foreground">This area is for administrators only.</p>
    </AppShell>
  ),
  component: AdminPage,
});

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="size-4" /> {label}
      </div>
      <p className="text-display mt-2 text-4xl">{value.toLocaleString()}</p>
    </div>
  );
}

function AdminPage() {
  const overview = useServerFn(getAdminOverview);
  const updateRole = useServerFn(setUserRole);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overview({ data: undefined }),
    retry: false,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <AppShell title="Admin">
        <p className="text-sm text-muted-foreground">Loading platform data…</p>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Admin">
        <p className="text-sm text-muted-foreground">
          You don't have access to this area.
        </p>
      </AppShell>
    );
  }

  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    try {
      await updateRole({ data: { userId, makeAdmin } });
      toast.success(makeAdmin ? "Admin access granted" : "Admin access removed");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update access");
    }
  }

  const s = data.stats;
  const adminSet = new Set(data.adminIds);
  const maxDay = Math.max(1, ...data.gamesPerDay.map((d) => d.count));
  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.count));

  return (
    <AppShell title="Admin" subtitle="Everything happening across Vibe.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Players" value={s.users} icon={Users} />
        <Stat label="Games" value={s.games} icon={Gamepad2} />
        <Stat label="Live now" value={s.activeGames} icon={Activity} />
        <Stat label="Questions" value={s.questions} icon={ListChecks} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="New players / 7d" value={s.newUsers} icon={Users} />
        <Stat label="New games / 7d" value={s.newGames} icon={Gamepad2} />
        <Stat label="Room joins" value={s.players} icon={ShieldCheck} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avg players / game</p>
          <p className="text-display mt-2 text-4xl">{s.avgPlayersPerGame}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Completed games</p>
          <p className="text-display mt-2 text-4xl">{s.completedGames.toLocaleString()}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Completion rate</p>
          <p className="text-display mt-2 text-4xl">{s.completionRate}%</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Games created · last 7 days</p>
          <div className="mt-5 flex h-32 items-end gap-2">
            {data.gamesPerDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{d.count}</span>
                <div
                  className="w-full rounded-t-md bg-citron"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 96)}px` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.day).toLocaleDateString(undefined, { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Popular categories</p>
          <div className="mt-4 space-y-3">
            {data.byCategory.length === 0 && (
              <p className="text-sm text-muted-foreground">No games yet.</p>
            )}
            {data.byCategory.map((c) => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-sm">
                  <span>{categoryLabel(c.category)}</span>
                  <span className="text-muted-foreground">{c.count}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-strong">
                  <div
                    className="h-2 rounded-full bg-citron"
                    style={{ width: `${(c.count / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel mt-4 overflow-hidden">
        <p className="border-b border-hairline px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Administrators ({data.admins.length})
        </p>
        <div className="divide-y divide-hairline">
          {data.admins.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <ShieldCheck className="size-4 text-citron" />
              <span className="text-sm">{a.username ?? "Unnamed"}</span>
              <button
                onClick={() => toggleAdmin(a.id, false)}
                className="press ml-auto rounded-lg border border-hairline px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Remove admin
              </button>
            </div>
          ))}
        </div>
      </div>


      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <p className="border-b border-hairline px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Newest players
          </p>
          <div className="divide-y divide-hairline">
            {data.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-strong text-[10px] font-semibold">
                  {initials(u.username)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm">{u.username ?? "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.games_played} played · {u.games_won} won · {u.total_points.toLocaleString()} pts
                  </p>
                </div>
                <button
                  onClick={() => toggleAdmin(u.id, !adminSet.has(u.id))}
                  className="press ml-auto shrink-0 rounded-lg border border-hairline px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {adminSet.has(u.id) ? "Remove admin" : "Make admin"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <p className="border-b border-hairline px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Latest games
          </p>
          <div className="divide-y divide-hairline">
            {data.recentGames.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{g.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.code} · {categoryLabel(g.category)} · host {g.host}
                  </p>
                </div>
                <span
                  className={cn(
                    "ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    g.status === "active"
                      ? "bg-citron text-citron-foreground"
                      : "bg-surface-strong text-muted-foreground",
                  )}
                >
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel mt-4 overflow-hidden">
        <p className="border-b border-hairline px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Top players
        </p>
        <div className="divide-y divide-hairline">
          {data.topPlayers.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4 px-4 py-3">
              <span className="text-display w-6 text-sm text-muted-foreground">{i + 1}</span>
              <span className="text-sm">{p.username ?? "Unnamed"}</span>
              <span className="text-display ml-auto text-lg">{p.total_points.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
