import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type GenerateInput = {
  category: string;
  topic?: string;
  count?: number;
};

export type GeneratedQuestion = {
  prompt: string;
  options: string[];
  correct_index: number;
};

const CATEGORY_BRIEF: Record<string, string> = {
  about_me: "personal questions a host's friends would guess about them (habits, tastes, quirks)",
  fun: "light, silly, fast-paced party questions for a group of friends",
  memories: "nostalgic questions about shared memories, trips, and moments",
  deep: "thoughtful, honest questions about values, feelings, and personality",
  custom: "fun social quiz questions for a group of friends",
};

export const generateQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GenerateInput) => ({
    category: String(input.category ?? "fun"),
    topic: String(input.topic ?? "").slice(0, 200),
    count: Math.min(Math.max(Number(input.count ?? 5), 1), 10),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured yet.");

    const brief = CATEGORY_BRIEF[data.category] ?? CATEGORY_BRIEF["fun"];
    const topicLine = data.topic ? `The quiz is about: ${data.topic}.` : "";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "You write multiple-choice questions for a social party quiz game. Always reply with JSON only.",
          },
          {
            role: "user",
            content: `Write ${data.count} ${brief}. ${topicLine} Each question must have exactly 4 short distinct answer options (max 6 words each) and one marked correct answer. Respond as JSON: {"questions":[{"prompt":"...","options":["a","b","c","d"],"correct_index":0}]}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const message = await res.text();
      if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits are used up. Add credits to keep generating.");
      throw new Error(`AI request failed: ${message.slice(0, 200)}`);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    let parsed: { questions?: GeneratedQuestion[] };
    try {
      parsed = JSON.parse(raw) as { questions?: GeneratedQuestion[] };
    } catch {
      throw new Error("The AI reply could not be read. Try again.");
    }

    const questions = (parsed.questions ?? [])
      .filter(
        (q) =>
          typeof q?.prompt === "string" &&
          Array.isArray(q?.options) &&
          q.options.length === 4 &&
          q.options.every((o) => typeof o === "string" && o.trim().length > 0),
      )
      .map((q) => ({
        prompt: q.prompt.trim(),
        options: q.options.map((o) => o.trim()),
        correct_index: Math.min(Math.max(Number(q.correct_index) || 0, 0), 3),
      }));

    if (questions.length === 0) throw new Error("The AI returned no usable questions. Try again.");
    return { questions };
  });
