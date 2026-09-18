import { Link } from "@tanstack/react-router";

export function VibeLogo({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-citron text-citron-foreground">
        <span className="text-display text-lg leading-none">V</span>
      </span>
      {!compact && (
        <span className="text-display text-2xl tracking-tight text-foreground">Vibe</span>
      )}
    </Link>
  );
}
