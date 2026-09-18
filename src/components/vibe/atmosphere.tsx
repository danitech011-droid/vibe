export function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="animate-drift absolute -right-24 -top-28 size-72 rounded-full bg-citron/12 blur-3xl" />
      <div
        className="animate-drift absolute -left-24 top-64 size-64 rounded-full bg-aqua/12 blur-3xl"
        style={{ animationDelay: "-5s" }}
      />
      <div
        className="animate-drift absolute bottom-24 -right-16 size-56 rounded-full bg-coral/10 blur-3xl"
        style={{ animationDelay: "-9s" }}
      />
    </div>
  );
}
