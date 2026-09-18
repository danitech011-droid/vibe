import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Could not verify your access.");
  if (!data) throw new Error("Forbidden");
}

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [users, games, players, questions, active, newUsers, newGames] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("games").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("game_players").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("game_questions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("games").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("games").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);

    const { data: recentUsers } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_seed, total_points, games_played, games_won, best_score, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: recentGames } = await supabaseAdmin
      .from("games")
      .select("id, title, code, category, status, created_at, host_id")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: topPlayers } = await supabaseAdmin
      .from("profiles")
      .select("id, username, total_points, games_won")
      .order("total_points", { ascending: false })
      .limit(10);

    const hostIds = [...new Set((recentGames ?? []).map((g) => g.host_id))];
    const { data: hosts } = hostIds.length
      ? await supabaseAdmin.from("profiles").select("id, username").in("id", hostIds)
      : { data: [] as { id: string; username: string | null }[] };
    const hostMap = Object.fromEntries((hosts ?? []).map((h) => [h.id, h.username ?? "Unknown"]));

    // Analytics: category + status breakdown, engagement averages
    const { data: allGames } = await supabaseAdmin
      .from("games")
      .select("category, status, created_at");

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const dayBuckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dayBuckets[d] = 0;
    }
    for (const g of allGames ?? []) {
      byCategory[g.category] = (byCategory[g.category] ?? 0) + 1;
      byStatus[g.status] = (byStatus[g.status] ?? 0) + 1;
      const day = String(g.created_at).slice(0, 10);
      if (day in dayBuckets) dayBuckets[day] = (dayBuckets[day] ?? 0) + 1;
    }

    const { data: adminRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = (adminRows ?? []).map((r) => r.user_id);

    const { data: adminProfiles } = adminIds.length
      ? await supabaseAdmin.from("profiles").select("id, username").in("id", adminIds)
      : { data: [] as { id: string; username: string | null }[] };

    const totalGames = games.count ?? 0;
    const totalPlayers = players.count ?? 0;

    return {
      stats: {
        users: users.count ?? 0,
        games: totalGames,
        players: totalPlayers,
        questions: questions.count ?? 0,
        activeGames: active.count ?? 0,
        newUsers: newUsers.count ?? 0,
        newGames: newGames.count ?? 0,
        avgPlayersPerGame: totalGames ? Math.round((totalPlayers / totalGames) * 10) / 10 : 0,
        completedGames: byStatus["finished"] ?? 0,
        completionRate: totalGames
          ? Math.round(((byStatus["finished"] ?? 0) / totalGames) * 100)
          : 0,
      },
      byCategory: Object.entries(byCategory)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      gamesPerDay: Object.entries(dayBuckets).map(([day, count]) => ({ day, count })),
      admins: (adminProfiles ?? []).map((a) => ({ id: a.id, username: a.username })),
      adminIds,
      recentUsers: recentUsers ?? [],
      recentGames: (recentGames ?? []).map((g) => ({ ...g, host: hostMap[g.host_id] ?? "Unknown" })),
      topPlayers: topPlayers ?? [],
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; makeAdmin: boolean }) => ({
    userId: String(input.userId),
    makeAdmin: Boolean(input.makeAdmin),
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
