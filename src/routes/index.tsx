import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Atmosphere } from "@/components/vibe/atmosphere";
import { VibeLogo } from "@/components/vibe/logo";
import { ThemeToggle } from "@/components/vibe/theme-toggle";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vibe — The social quiz game for your people" },
      {
        name: "description",
        content:
          "Create fun quizzes, invite friends with a game code, and compete live to see who really knows your vibe.",
      },
      { property: "og:title", content: "Vibe — The social quiz game for your people" },
      {
        property: "og:description",
        content:
          "Create fun quizzes, invite friends with a game code, and compete live to see who really knows your vibe.",
      },
    ],
  }),
  component: Landing,
});

const DEMO = {
  prompt: "Which snack do I steal first from the table?",
  options: ["Cheesy chips", "Dark chocolate", "Popcorn", "That one gummy"],
  correct: 2,
};

const OPTION_TONES = ["bg-option-a", "bg-option-b", "bg-option-c", "bg-option-d"];

function GamePreview() {
  const [seconds, setSeconds] = useState(9);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(12450);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setPicked((p) => (p === null ? DEMO.correct : null));
          setScore((v) => (v > 14000 ? 12450 : v + 900));
          return 9;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const progress = (seconds / 9) * 100;

  return (
    <div className="panel relative overflow-hidden p-4 shadow-[var(--shadow-lift)]">
      <div
        aria-hidden
        className="animate-sheen pointer-events-none absolute -top-8 left-0 h-40 w-24 bg-gradient-to-r from-transparent via-foreground/8 to-transparent"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Question 3 / 8
          </span>
          <p className="mt-1.5 text-lg font-medium leading-snug">{DEMO.prompt}</p>
        </div>
        <div className="relative grid size-11 shrink-0 place-items-center">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(var(--citron) 0 ${progress}%, var(--hairline) 0)`,
            }}
          />
          <span className="absolute inset-[3px] rounded-full bg-background" />
          <span className="text-display relative text-lg leading-none">{seconds}</span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        {DEMO.options.map((option, i) => (
          <div
            key={option}
            className={cn(
              "rounded-xl px-3 py-3.5 text-left text-sm font-semibold text-option-ink transition-all duration-300",
              OPTION_TONES[i],
              picked !== null && i !== DEMO.correct && "opacity-35",
              picked === i && "ring-2 ring-foreground/40",
            )}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">
              {String.fromCharCode(65 + i)}
            </span>
            {option}
          </div>
        ))}
      </div>

      <div className="relative mt-3 flex items-center justify-between rounded-xl border border-hairline px-3 py-2.5">
        <span className="text-xs text-muted-foreground">Live score</span>
        <span key={score} className="animate-pop text-display text-2xl leading-none">
          {score.toLocaleString()}
        </span>
      </div>

      <div className="relative mt-3 space-y-2">
        {[
          ["1", "Mara", "2,400"],
          ["2", "Theo", "1,900"],
          ["3", "Priya", "1,600"],
        ].map(([rank, name, points]) => (
          <div
            key={name}
            className="flex items-center gap-3 rounded-xl border border-hairline px-3 py-2"
          >
            <span
              className={cn(
                "text-display grid size-7 place-items-center rounded-full text-sm",
                rank === "1"
                  ? "bg-citron text-citron-foreground"
                  : "bg-surface-strong text-foreground",
              )}
            >
              {rank}
            </span>
            <span className="text-sm">{name}</span>
            <span className="text-display ml-auto text-base">{points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Landing() {
  const { user } = useAuth();
  const primaryTo = user ? "/dashboard" : "/auth";

  return (
    <div className="relative min-h-screen bg-background">
      <Atmosphere />
      <div className="relative mx-auto w-full max-w-5xl px-5 pb-16 md:px-8">
        <header className="flex items-center justify-between py-5">
          <VibeLogo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to={primaryTo}
              className="press rounded-full border border-hairline px-4 py-2 text-sm font-medium"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-10 pt-6 md:grid-cols-2 md:pt-14">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="size-3 text-citron" /> Real-time social quiz
            </span>
            <h1 className="text-display mt-5 text-[2.9rem] leading-[1.02] md:text-6xl">
              Discover how well your friends really know you.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Create fun quizzes, invite your people, and compete to see who understands your vibe.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to={user ? "/create" : "/auth"}
                className="press glow-ring rounded-xl bg-citron px-6 py-3.5 text-center text-base font-semibold text-citron-foreground"
              >
                Create Game
              </Link>
              <Link
                to={user ? "/join" : "/auth"}
                className="press rounded-xl border border-hairline bg-surface px-6 py-3.5 text-center text-base font-semibold"
              >
                Join Game
              </Link>
            </div>
          </div>

          <div className="animate-rise" style={{ animationDelay: "140ms" }}>
            <GamePreview />
          </div>
        </section>

        <section className="mt-24">
          <h2 className="text-display text-3xl md:text-4xl">Snap in. Answer. Win.</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            The half-second before the buzzer locks your pick.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Build a room", "Pick a category, get a code."],
              ["02", "Invite people", "Friends, family, classmates."],
              ["03", "Race the clock", "Fastest correct answer scores big."],
            ].map(([n, title, copy]) => (
              <div key={n} className="panel p-5">
                <span className="text-display text-2xl leading-none text-citron">{n}</span>
                <p className="mt-3 font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-display text-3xl">Built for every table</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              One quiz engine for friends, family, classmates, and communities — not just two
              people.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Friends", "Family", "Classmates", "Communities"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Live lobby", "Watch players land as the code spreads."],
              ["Timed rounds", "Speed decides the points, not just accuracy."],
              ["Ranked profiles", "Points, wins and best scores follow you."],
              ["Your own packs", "Write questions only your people could answer."],
            ].map(([title, copy]) => (
              <div key={title} className="panel p-4">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel mt-20 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["“We ran three rounds before dinner. Genuinely the best part of the weekend.”", "The Kowalski family game night"],
              ["“My students begged for one more round. Never seen that in a Friday class.”", "Naomi, secondary school teacher"],
              ["“Our group chat found out we know nothing about each other. 10/10.”", "Priya, dorm game night"],
            ].map(([quote, who]) => (
              <figure key={who}>
                <blockquote className="text-sm leading-relaxed">{quote}</blockquote>
                <figcaption className="mt-3 text-xs text-muted-foreground">— {who}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-display text-3xl">Questions</h2>
          <div className="mt-5 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline">
            {[
              ["Do I need an account to play?", "You need a free account to host or keep your ranking. Joining takes seconds with a code."],
              ["How many people can join a room?", "Up to 50 players in a single lobby, so a whole class or family reunion fits."],
              ["Is Vibe only for couples?", "No. Vibe is built for friends, family, classmates and communities — couples are just one of the modes."],
              ["Can I write my own questions?", "Yes. Choose Custom Quiz when creating a game and write every prompt and answer yourself."],
            ].map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {q}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="pt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-hairline pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <VibeLogo />
            <span className="text-xs text-muted-foreground">Made for the table</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground">
              Create a game
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              Join with a code
            </Link>
            <Link to="/leaderboard" className="hover:text-foreground">
              Leaderboard
            </Link>
          </div>
          <p className="mt-6 text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Vibe. All vibes reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
