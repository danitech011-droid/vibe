export type CategoryId = "about_me" | "fun" | "memories" | "deep" | "custom";

export const CATEGORIES: {
  id: CategoryId;
  label: string;
  blurb: string;
  tone: "citron" | "aqua" | "coral" | "amber";
}[] = [
  { id: "about_me", label: "About Me", blurb: "How well do they really know you?", tone: "citron" },
  { id: "fun", label: "Fun Questions", blurb: "Light, fast, ridiculous.", tone: "aqua" },
  { id: "memories", label: "Memories", blurb: "Moments only your people remember.", tone: "amber" },
  { id: "deep", label: "Deep Questions", blurb: "Slower rounds, honest answers.", tone: "coral" },
  { id: "custom", label: "Custom Quiz", blurb: "Write every question yourself.", tone: "citron" },
];

export const GAME_STYLES = [
  { id: "friends", label: "Friends", blurb: "Group chat energy" },
  { id: "couple", label: "Couple", blurb: "Just the two of you" },
  { id: "family", label: "Family", blurb: "Every generation" },
  { id: "community", label: "Community", blurb: "Classes, clubs, events" },
] as const;

export type QuestionDraft = {
  prompt: string;
  options: string[];
  correct_index: number;
};

const PACKS: Record<Exclude<CategoryId, "custom">, QuestionDraft[]> = {
  about_me: [
    {
      prompt: "What's my go-to order at a coffee shop?",
      options: ["Flat white", "Iced matcha", "Black filter", "Hot chocolate"],
      correct_index: 1,
    },
    {
      prompt: "Which of these would I never do on a free Saturday?",
      options: ["Sleep until noon", "Run a 10k", "Cook all day", "Binge a series"],
      correct_index: 1,
    },
    {
      prompt: "What's my most-used app after messages?",
      options: ["Maps", "Notes", "Camera", "Music"],
      correct_index: 3,
    },
    {
      prompt: "Pick my comfort meal.",
      options: ["Ramen", "Roast dinner", "Jollof rice", "Grilled cheese"],
      correct_index: 2,
    },
    {
      prompt: "How do I actually take criticism?",
      options: ["Quietly, then think", "Debate instantly", "Laugh it off", "Write it down"],
      correct_index: 0,
    },
  ],
  fun: [
    {
      prompt: "If our group were stranded, who eats the emergency snacks first?",
      options: ["The host", "The quiet one", "The planner", "Everyone at once"],
      correct_index: 3,
    },
    {
      prompt: "Best possible superpower for a group chat?",
      options: ["Unsend anything", "Read minds", "Teleport", "Freeze time"],
      correct_index: 0,
    },
    {
      prompt: "Which one is objectively the worst chore?",
      options: ["Dishes", "Laundry folding", "Bins", "Bathroom"],
      correct_index: 1,
    },
    {
      prompt: "Pick the most chaotic night out ending.",
      options: ["Karaoke", "3am food", "Lost jacket", "Missed last train"],
      correct_index: 2,
    },
    {
      prompt: "Which snack disappears first from the table?",
      options: ["Chips", "Chocolate", "Popcorn", "Gummies"],
      correct_index: 0,
    },
  ],
  memories: [
    {
      prompt: "Where did we first meet?",
      options: ["School", "Work", "A party", "Online"],
      correct_index: 2,
    },
    {
      prompt: "What was our worst shared idea?",
      options: ["That road trip", "The group costume", "Cooking experiment", "The 6am hike"],
      correct_index: 0,
    },
    {
      prompt: "Which trip do we still talk about?",
      options: ["The coast", "The city weekend", "The cabin", "The festival"],
      correct_index: 2,
    },
    {
      prompt: "Who took the most photos that day?",
      options: ["Me", "You", "The host", "Nobody"],
      correct_index: 1,
    },
    {
      prompt: "What song instantly brings that year back?",
      options: ["The summer one", "The car one", "The karaoke one", "The sad one"],
      correct_index: 2,
    },
  ],
  deep: [
    {
      prompt: "What do I value most in a friendship?",
      options: ["Honesty", "Consistency", "Humour", "Ambition"],
      correct_index: 1,
    },
    {
      prompt: "What am I most quietly proud of?",
      options: ["My work", "My family", "How far I've come", "My taste"],
      correct_index: 2,
    },
    {
      prompt: "What do I struggle to say out loud?",
      options: ["I need help", "I'm sorry", "I'm proud of you", "No"],
      correct_index: 3,
    },
    {
      prompt: "Where do I want to be in five years?",
      options: ["Same city, bigger life", "Somewhere new", "Somewhere quiet", "No idea yet"],
      correct_index: 1,
    },
    {
      prompt: "What recharges me fastest?",
      options: ["People", "Silence", "Movement", "Making something"],
      correct_index: 1,
    },
  ],
};

export function questionsFor(category: CategoryId): QuestionDraft[] {
  if (category === "custom") return [];
  return PACKS[category];
}

export function generateCode() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `VIBE-${digits}`;
}

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Quiz";
}

export const AVATAR_SEEDS = [
  "aurora",
  "comet",
  "ember",
  "fable",
  "harbor",
  "juniper",
  "koda",
  "lumen",
  "mesa",
  "nova",
  "onyx",
  "pixel",
];

export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

export function initials(name: string | null | undefined) {
  if (!name) return "V";
  return name
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function scoreFor(msLeft: number, totalMs: number) {
  const ratio = Math.max(0, Math.min(1, msLeft / totalMs));
  return Math.round(500 + 500 * ratio);
}
