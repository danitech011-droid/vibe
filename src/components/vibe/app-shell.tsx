import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, LogOut, PlusCircle, ShieldCheck, Ticket, Trophy, User2, Gamepad2 } from "lucide-react";
import type { ReactNode } from "react";

import { Atmosphere } from "@/components/vibe/atmosphere";
import { VibeLogo } from "@/components/vibe/logo";
import { ThemeToggle } from "@/components/vibe/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useProfile } from "@/lib/auth";
import { avatarUrl, initials } from "@/lib/vibe";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/create", label: "Create", icon: PlusCircle },
  { to: "/join", label: "Join", icon: Ticket },
  { to: "/my-games", label: "My Games", icon: Gamepad2 },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User2 },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const { data: profile } = useProfile();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Atmosphere />
      <div className="relative mx-auto flex w-full max-w-6xl gap-8 px-4 pb-28 pt-5 md:px-8 md:pb-12">
        <aside className="hidden w-56 shrink-0 flex-col gap-8 md:flex">
          <VibeLogo />
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-surface-strong text-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                activeProps={{ className: "bg-surface-strong text-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              >
                <ShieldCheck className="size-4" />
                Admin
              </Link>
            )}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <ThemeToggle />
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-7 flex items-center justify-between gap-4">
            <div className="md:hidden">
              <VibeLogo />
            </div>
            <div className="hidden min-w-0 md:block">
              {title && <h1 className="text-display text-4xl">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <Link to="/profile" className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {profile?.username ?? "Player"}
              </span>
              <span className="grid size-9 place-items-center overflow-hidden rounded-full border border-hairline bg-surface text-xs font-semibold">
                {profile?.avatar_seed ? (
                  <img src={avatarUrl(profile.avatar_seed)} alt="" className="size-full" />
                ) : (
                  initials(profile?.username)
                )}
              </span>
            </Link>
          </header>

          {(title || subtitle) && (
            <div className="mb-6 md:hidden">
              {title && <h1 className="text-display text-4xl">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}

          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-background/85 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 py-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className={cn("press flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5")}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
