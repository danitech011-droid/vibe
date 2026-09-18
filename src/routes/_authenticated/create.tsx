import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { generateQuestions } from "@/lib/ai.functions";

import { AppShell } from "@/components/vibe/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { CATEGORIES, generateCode, questionsFor, type CategoryId, type QuestionDraft } from "@/lib/vibe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Create a game — Vibe" },
      { name: "description", content: "Name your quiz, pick a category and generate a game code to invite your people." },
      { property: "og:title", content: "Create a game — Vibe" },
      { property: "og:description", content: "Name your quiz, pick a category and generate a game code to invite your people." },
    ],
  }),
  component: CreateGame,
});

const emptyQuestion = (): QuestionDraft => ({ prompt: "", options: ["", "", "", ""], correct_index: 0 });

function CreateGame() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryId>("about_me");
  const [custom, setCustom] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<QuestionDraft[] | null>(null);
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const generate = useServerFn(generateQuestions);

  async function runGenerate() {
    setGenerating(true);
    try {
      const result = await generate({ data: { category, topic, count } });
      setAiQuestions(result.questions);
      if (category === "custom") setCustom(result.questions);
      toast.success(`${result.questions.length} questions ready`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate questions");
    } finally {
      setGenerating(false);
    }
  }

  async function create() {
    if (!title.trim()) {
      toast.error("Give your game a title");
      return;
    }
    const questions =
      category === "custom"
        ? custom.filter((q) => q.prompt.trim() && q.options.every((o) => o.trim()))
        : (aiQuestions ?? questionsFor(category));
    if (questions.length === 0) {
      toast.error("Add at least one complete question");
      return;
    }

    setBusy(true);
    try {
      const code = generateCode();
      const { data: game, error } = await supabase
        .from("games")
        .insert({ host_id: user!.id, title: title.trim(), category, code })
        .select("*")
        .single();
      if (error) throw error;

      const { error: qError } = await supabase.from("game_questions").insert(
        questions.map((q, position) => ({
          game_id: game.id,
          position,
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correct_index,
        })),
      );
      if (qError) throw qError;

      const { error: pError } = await supabase.from("game_players").insert({
        game_id: game.id,
        user_id: user!.id,
        display_name: profile?.username ?? "Host",
        is_host: true,
      });
      if (pError) throw pError;

      navigate({ to: "/room/$code", params: { code: game.code } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the game");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Create a game" subtitle="Set the tone, then send the code.">
      <div className="panel space-y-6 p-5 md:p-7">
        <div>
          <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Game title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunday night vibe check"
            className="mt-2 w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Category
          </label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "press rounded-xl border border-hairline p-4 text-left transition-colors",
                  category === c.id ? "bg-citron text-citron-foreground" : "bg-surface",
                )}
              >
                <p className="text-sm font-semibold">{c.label}</p>
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    category === c.id ? "opacity-75" : "text-muted-foreground",
                  )}
                >
                  {c.blurb}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-citron" />
            <p className="text-sm font-semibold">Let AI write the questions</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on the category you picked. Add a hint to make it personal.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Optional: our road trip, my flatmate Sara…"
              className="w-full rounded-lg border border-hairline bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-hairline bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {[3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
            </select>
            <button
              onClick={runGenerate}
              disabled={generating}
              className={cn(
                "press shrink-0 rounded-lg bg-citron px-4 py-2.5 text-sm font-semibold text-citron-foreground",
                generating && "opacity-60",
              )}
            >
              {generating ? "Writing…" : "Generate"}
            </button>
          </div>
          {aiQuestions && category !== "custom" && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {aiQuestions.length} AI questions will be used for this game.
              </p>
              {aiQuestions.map((q, i) => (
                <p key={i} className="truncate text-xs text-muted-foreground">
                  {i + 1}. {q.prompt}
                </p>
              ))}
            </div>
          )}
        </div>


        {category === "custom" && (
          <div className="space-y-4">
            {custom.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-hairline p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Question {qi + 1}
                  </span>
                  {custom.length > 1 && (
                    <button
                      onClick={() => setCustom(custom.filter((_, i) => i !== qi))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <input
                  value={q.prompt}
                  onChange={(e) =>
                    setCustom(custom.map((c, i) => (i === qi ? { ...c, prompt: e.target.value } : c)))
                  }
                  placeholder="What would I never order at a restaurant?"
                  className="mt-2 w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {q.options.map((option, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCustom(
                            custom.map((c, i) => (i === qi ? { ...c, correct_index: oi } : c)),
                          )
                        }
                        aria-label={`Mark option ${oi + 1} correct`}
                        className={cn(
                          "size-5 shrink-0 rounded-full border border-hairline",
                          q.correct_index === oi && "bg-citron",
                        )}
                      />
                      <input
                        value={option}
                        onChange={(e) =>
                          setCustom(
                            custom.map((c, i) =>
                              i === qi
                                ? {
                                    ...c,
                                    options: c.options.map((o, j) => (j === oi ? e.target.value : o)),
                                  }
                                : c,
                            ),
                          )
                        }
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setCustom([...custom, emptyQuestion()])}
              className="press inline-flex items-center gap-2 rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium"
            >
              <Plus className="size-4" /> Add question
            </button>
          </div>
        )}

        <button
          onClick={create}
          disabled={busy}
          className={cn(
            "press glow-ring w-full rounded-xl bg-citron px-6 py-3.5 text-base font-semibold text-citron-foreground",
            busy && "opacity-60",
          )}
        >
          {busy ? "Generating code…" : "Create game & get code"}
        </button>
      </div>
    </AppShell>
  );
}
