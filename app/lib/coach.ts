/*
  Client-side wrapper around the `advisor-coach` Edge Function.

  The Gemini key lives only on the function, so the browser never sees it.
  `supabase.functions.invoke` attaches the signed-in user's JWT
  automatically, which is what the function authenticates against.
*/

import { getSupabase, isSupabaseConfigured } from "./supabase";

export type CoachMode = "chat" | "rate" | "opportunities";

export type SubScore = { score: number; rationale: string };

export type Rating = {
  summary: string;
  overall: number;
  subscores: {
    academics: SubScore;
    extracurriculars: SubScore;
    leadership: SubScore;
  };
  quick_wins: { title: string; why: string; effort: string }[];
  missing_data: { section: string; why_it_matters: string; where: string }[];
};

export type CoachSource = { title: string; url: string };

export type CoachReply = {
  mode: CoachMode;
  text: string;
  rating: Rating | null;
  sources: CoachSource[];
  conversationId: string | null;
};

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  rating?: Rating | null;
  sources?: CoachSource[];
};

/** Scores are rendered as bars, so keep them inside their stated range. */
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

function normalizeRating(rating: Rating | null): Rating | null {
  if (!rating) return null;
  const fixSub = (sub: SubScore): SubScore => ({
    score: clamp(sub?.score ?? 0, 1, 10),
    rationale: sub?.rationale ?? "",
  });
  return {
    ...rating,
    overall: clamp(rating.overall, 0, 100),
    subscores: {
      academics: fixSub(rating.subscores?.academics),
      extracurriculars: fixSub(rating.subscores?.extracurriculars),
      leadership: fixSub(rating.subscores?.leadership),
    },
    quick_wins: Array.isArray(rating.quick_wins) ? rating.quick_wins.slice(0, 3) : [],
    missing_data: Array.isArray(rating.missing_data) ? rating.missing_data : [],
  };
}

/**
 * Edge Function errors arrive as a FunctionsHttpError whose real message is
 * in the (already-consumed) response body. Dig it out so the user sees the
 * actual reason — quota reached, session expired — instead of "non-2xx".
 */
async function readError(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = (await context.clone().json()) as { error?: string } | null;
      if (body?.error) return String(body.error);
    } catch {
      /* body wasn't JSON — fall through to the generic message */
    }
  }
  const message = (error as { message?: string })?.message;
  return message || "The coach didn't respond. Try again.";
}

export async function askCoach(input: {
  mode: CoachMode;
  message?: string;
  conversationId?: string | null;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<CoachReply> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase isn't configured, so the coach can't reach your data.");
  }

  const { data, error } = await getSupabase().functions.invoke("advisor-coach", {
    body: {
      mode: input.mode,
      message: input.message ?? "",
      conversationId: input.conversationId ?? null,
      history: input.history ?? [],
    },
  });

  if (error) throw new Error(await readError(error));
  if (!data) throw new Error("The coach returned an empty response.");
  if ((data as { error?: string }).error) throw new Error(String((data as { error: string }).error));

  const reply = data as CoachReply;
  return { ...reply, rating: normalizeRating(reply.rating) };
}

/* ───────────────────────── quick actions ───────────────────────── */

export const QUICK_ACTIONS: {
  id: string;
  label: string;
  mode: CoachMode;
  message?: string;
  icon: "gauge" | "compass" | "zap" | "target";
}[] = [
  { id: "rate", label: "Rate my application", mode: "rate", icon: "gauge" },
  {
    id: "opportunities",
    label: "Find matched opportunities",
    mode: "opportunities",
    icon: "compass",
  },
  {
    id: "wins",
    label: "What are my quick wins?",
    mode: "chat",
    message:
      "Based on my dashboard, what are the three highest-leverage things I could do in the next month to strengthen my profile? Be specific about what's weak right now.",
    icon: "zap",
  },
  {
    id: "gaps",
    label: "Where am I weakest?",
    mode: "chat",
    message:
      "Look at my academics, activities, and service record. Which single area is weakest relative to a competitive applicant, and what would fixing it actually take?",
    icon: "target",
  },
];
