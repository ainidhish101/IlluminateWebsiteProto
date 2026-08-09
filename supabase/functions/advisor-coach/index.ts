/*
  DELIVERABLE 2 — `advisor-coach` Supabase Edge Function (Deno).

  Backed by Google's Gemini API (gemini-2.5-flash-lite) rather than Claude —
  swapped in for price. Called via raw `fetch()` against the documented REST
  endpoint rather than the `@google/genai` SDK: the SDK's current top-level
  method name wasn't something this file's author could verify with
  confidence, while the wire protocol below comes straight from Google's REST
  reference, so hitting it directly removes an entire class of "guessed the
  binding wrong" risk. Swap in the SDK later if you want; the request/response
  shapes here should still tell you what to send it.

  Request lifecycle:
    1. Authenticate the caller from their JWT.
    2. Read their dashboard rows *through their own token*, so Row Level
       Security scopes the query — this function cannot read another
       student's data even if asked to.
    3. Strip identifiers and build the prompt context (see prompt.ts).
    4. Optionally run a free web search for opportunity matching.
    5. Call Gemini with the key held server-side.
    6. Persist the exchange and return a typed payload.

  WHY NO SERVICE ROLE KEY:
  The obvious design injects SUPABASE_SERVICE_ROLE_KEY here, but that key
  bypasses every RLS policy in the schema — a bug in this file would then be
  a data breach across all students. Using the caller's own JWT means the
  database enforces the same boundary it enforces for the browser, and the
  two things that genuinely need elevated rights (rate limiting, usage
  logging) are SECURITY DEFINER functions with narrow, fixed behavior.
*/

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildSystemPrompt, RATING_SCHEMA } from "./prompt.ts";
import { buildQuery, formatResults, isSearchConfigured, runSearch } from "./search.ts";
import type {
  CoachContext,
  CoachMode,
  CoachRequest,
  CoachResponse,
  RatingPayload,
} from "./types.ts";

/* ───────────────────────── configuration ───────────────────────── */

/*
  Model choice: gemini-3.1-flash-lite, not the cheapest available option.

  gemini-2.5-flash-lite was tried first as the lowest-priced model on
  Google's pricing page, but Google had already cut it off for new API keys
  ("no longer available to new users") despite still listing it — confirmed
  by a live 404 from this exact endpoint. gemini-2.0-flash-lite is cheaper
  still ($0.075/$0.30 per 1M vs 3.1's $0.25/$0.50) but is explicitly marked
  deprecated on Google's own pricing page, i.e. next in line for the same
  cutoff. 3.1 is the cheapest option that ISN'T flagged for near-term
  removal — confirmed live against this API key via GET /v1beta/models on
  2026-08-09. If you change this, re-run that same check first:

    curl.exe -s "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" -H "x-goog-api-key: YOUR_KEY"

  A model appearing there is not proof it still accepts calls — verify with
  a real request, the way this one was.
*/
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Output token ceiling per mode. `rate` needs the most room for the JSON payload. */
const MODE_CONFIG: Record<CoachMode, { maxOutputTokens: number }> = {
  chat: { maxOutputTokens: 2048 },
  rate: { maxOutputTokens: 4096 },
  opportunities: { maxOutputTokens: 3072 },
};

/** Turns kept from client-supplied history. Bounds prompt size and cost. */
const MAX_HISTORY_TURNS = 12;
const MAX_MESSAGE_CHARS = 2000;

/*
  ALLOWED_ORIGIN accepts a comma-separated list, e.g.
  "http://localhost:5173,https://your-site.workers.dev" — a real workflow
  needs both localhost (for continued dev) and the production domain live at
  once, not one or the other.

  CORS has no wildcard-plus-list mode: the browser only accepts an
  Access-Control-Allow-Origin that matches its own origin exactly, so serving
  multiple origins means echoing back whichever one the request actually came
  from, checked against the allowlist — never a fixed string. Get this wrong
  and the browser drops the response with no readable error on the client
  side, which is exactly what "Failed to send a request to the Edge Function"
  looks like — there is nothing further to unwrap; the fetch itself failed.
*/
function buildCorsHeaders(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin =
    allowed.length === 0 // unset -> wide open, the permissive dev default
      ? "*"
      : allowed.includes(origin)
        ? origin
        : allowed[0]; // no match: won't satisfy the browser, but keeps the response well-formed

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // Tells any cache that the response varies by Origin, since the same
    // request path now returns a different ACAO value per caller.
    Vary: "Origin",
  };
}

/** Best-effort message extraction so a caught `unknown` still says something useful. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error).slice(0, 300);
  } catch {
    return "unknown error";
  }
}

/* ───────────────────────── Gemini client ───────────────────────── */

type GeminiPart = { text: string };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

type GeminiResponse = {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function callGemini(input: {
  apiKey: string;
  systemInstruction: string;
  contents: GeminiContent[];
  maxOutputTokens: number;
  /** JSON-schema-shaped object; presence switches the response into structured JSON mode. */
  responseSchema?: Record<string, unknown>;
}): Promise<GeminiResponse> {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: input.maxOutputTokens,
    // Held modest and fixed rather than exposed as a tuning knob — a coach
    // should sound like the same coach turn to turn, not vary in tone.
    temperature: 0.5,
  };
  if (input.responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = input.responseSchema;
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Header rather than the documented ?key= query param, so the key
      // never ends up in a server access log or a Referer header.
      "x-goog-api-key": input.apiKey,
    },
    body: JSON.stringify({
      contents: input.contents,
      systemInstruction: { parts: [{ text: input.systemInstruction }] },
      generationConfig,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new GeminiError(response.status, bodyText.slice(0, 500));
  }

  return (await response.json()) as GeminiResponse;
}

/* ───────────────────────── handler ───────────────────────── */

Deno.serve(async (req: Request) => {
  // Computed once per request from THIS request's Origin header — see
  // buildCorsHeaders' comment for why a fixed header can't serve two origins.
  const cors = buildCorsHeaders(req);
  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    return json(
      { error: "The coach isn't configured yet — GEMINI_API_KEY is not set on this function." },
      500,
    );
  }

  // Supabase injects these into every Edge Function; the SB_* names are the
  // newer aliases, kept as a fallback so this works on either runtime.
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Supabase environment variables are missing on this function." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Sign in to use the coach." }, 401);
  }

  // Every query below runs as this user — RLS is the access boundary.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return json({ error: "Your session expired. Sign in again." }, 401);
  }

  /* ── parse and validate the request ── */

  let body: CoachRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request body." }, 400);
  }

  const mode: CoachMode = ["chat", "rate", "opportunities"].includes(body.mode)
    ? body.mode
    : "chat";
  const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
  if (mode === "chat" && message.length === 0) {
    return json({ error: "Type a question first." }, 400);
  }

  /* ── rate limit (SECURITY DEFINER; a client cannot forge its own count) ── */

  const { data: allowed, error: limitError } = await supabase.rpc("coach_consume_quota");
  if (limitError) {
    console.error("rate limit rpc failed", limitError);
    // Surfaced verbatim rather than a generic message: this is a private
    // single-tenant deployment being debugged by its own operator, and the
    // CLI on this machine has no `functions logs` command to check instead.
    return json(
      {
        error: `Quota check failed — ${limitError.message}${
          limitError.hint ? ` (hint: ${limitError.hint})` : ""
        } [${limitError.code ?? "no code"}]`,
      },
      500,
    );
  }
  if (allowed === false) {
    return json(
      { error: "You've hit today's coaching limit. It resets at midnight UTC." },
      429,
    );
  }

  /* ── gather context (RLS-scoped) ── */

  let context: CoachContext;
  try {
    context = await loadContext(supabase, user.id);
  } catch (error) {
    console.error("context load failed", error);
    return json({ error: `Couldn't read your dashboard data — ${describeError(error)}` }, 500);
  }

  /* ── optional live search ── */

  let searchBlock: string | undefined;
  let sources: { title: string; url: string }[] = [];

  if (mode === "opportunities") {
    const results = await runSearch(
      buildQuery(context.profile?.interests ?? null, context.profile?.grade_level ?? null),
    );
    if (results && results.length > 0) {
      searchBlock = formatResults(results);
      sources = results.map((r) => ({ title: r.title, url: r.url }));
    }
  }

  /* ── call Gemini ── */

  const config = MODE_CONFIG[mode];

  // Gemini's `contents` array alternates user/model turns; our stored
  // history is user/assistant, which maps directly onto user/model.
  const historyContents: GeminiContent[] = (body.history ?? [])
    .filter((turn) => turn && typeof turn.content === "string" && turn.content.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content.slice(0, MAX_MESSAGE_CHARS) }],
    }));

  // Each mode gets a concrete opening instruction so the model never has to
  // guess what the button press meant.
  const opening =
    mode === "rate"
      ? "Rate my application profile using the diagnostic framework."
      : mode === "opportunities"
        ? message ||
          "Find opportunities matched to my profile — programs, competitions, and projects I could realistically pursue."
        : message;

  let gemini: GeminiResponse;
  try {
    gemini = await callGemini({
      apiKey: geminiKey,
      systemInstruction: buildSystemPrompt(mode, context, searchBlock),
      contents: [...historyContents, { role: "user", parts: [{ text: opening }] }],
      maxOutputTokens: config.maxOutputTokens,
      responseSchema: mode === "rate" ? RATING_SCHEMA : undefined,
    });
  } catch (error) {
    console.error("gemini call failed", error);
    if (error instanceof GeminiError && error.status === 429) {
      return json({ error: "The coach is busy right now. Try again in a moment." }, 429);
    }
    return json({ error: `The coach couldn't answer that — ${describeError(error)}` }, 502);
  }

  // A blocked prompt has no candidates at all; a blocked *completion* has a
  // candidate whose finishReason is something other than STOP/MAX_TOKENS
  // (e.g. SAFETY, RECITATION). Either way, treat it as a decline rather than
  // reading .content off a shape that may not have one.
  const candidate = gemini.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const declined =
    !!gemini.promptFeedback?.blockReason ||
    !candidate ||
    (!!finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS");

  if (declined) {
    console.warn("gemini declined", { blockReason: gemini.promptFeedback?.blockReason, finishReason });
    return json(
      {
        error:
          "The coach declined to answer that one. Rephrase it around your academics, activities, or goals.",
      },
      422,
    );
  }

  const text = (candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();

  let rating: RatingPayload | null = null;
  if (mode === "rate") {
    try {
      rating = JSON.parse(text) as RatingPayload;
    } catch (error) {
      console.error("rating JSON parse failed", error, text.slice(0, 500));
      return json({ error: "The rating came back malformed. Try again." }, 502);
    }
  }

  /* ── persist (best effort — a logging failure must not lose the answer) ── */

  let conversationId = body.conversationId ?? null;
  try {
    conversationId = await persist(supabase, user.id, conversationId, {
      mode,
      userText: mode === "chat" ? message : opening,
      assistantText: text,
      rating,
      sources,
    });
  } catch (error) {
    console.warn("coach persistence failed", error);
  }

  const payload: CoachResponse = {
    mode,
    text: mode === "rate" ? (rating?.summary ?? text) : text,
    rating,
    sources,
    conversationId,
    usage: gemini.usageMetadata
      ? {
          input_tokens: gemini.usageMetadata.promptTokenCount ?? 0,
          output_tokens: gemini.usageMetadata.candidatesTokenCount ?? 0,
        }
      : null,
  };

  return json(payload);
});

/* ───────────────────────── data access ───────────────────────── */

type Db = ReturnType<typeof createClient>;

/**
 * Loads every table the coach reasons over. Column lists are narrow on
 * purpose — nothing is selected that `buildContext` wouldn't use.
 */
async function loadContext(supabase: Db, userId: string): Promise<CoachContext> {
  const [profile, records, activities, goals, hours, tasks, submissions] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, grade_level, interests, role")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("academic_records")
      .select("course_name, grade, credits, semester")
      .eq("user_id", userId),
    supabase
      .from("extracurriculars")
      .select("category, activity_name, position, hours, achievements")
      .eq("user_id", userId),
    supabase.from("goals").select("title, horizon, status, target_date").eq("user_id", userId),
    supabase.from("volunteer_hours").select("hours, reason, date").eq("user_id", userId),
    supabase.from("tasks").select("status, due_date").eq("assigned_to", userId),
    supabase.from("guides_submissions").select("status").eq("user_id", userId),
  ]);

  return {
    profile: (profile.data as CoachContext["profile"]) ?? null,
    records: (records.data as CoachContext["records"]) ?? [],
    activities: (activities.data as CoachContext["activities"]) ?? [],
    goals: (goals.data as CoachContext["goals"]) ?? [],
    hours: (hours.data as CoachContext["hours"]) ?? [],
    tasks: (tasks.data as CoachContext["tasks"]) ?? [],
    submissions: (submissions.data as CoachContext["submissions"]) ?? [],
  };
}

/** Writes the turn pair, creating the conversation on first message. */
async function persist(
  supabase: Db,
  userId: string,
  conversationId: string | null,
  turn: {
    mode: CoachMode;
    userText: string;
    assistantText: string;
    rating: RatingPayload | null;
    sources: { title: string; url: string }[];
  },
): Promise<string | null> {
  let id = conversationId;

  if (!id) {
    const { data, error } = await supabase
      .from("coach_conversations")
      .insert({ user_id: userId, title: turn.userText.slice(0, 80) || "Coaching session" })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id as string;
  }

  const { error } = await supabase.from("coach_messages").insert([
    {
      conversation_id: id,
      user_id: userId,
      role: "user",
      content: turn.userText,
      mode: turn.mode,
    },
    {
      conversation_id: id,
      user_id: userId,
      role: "assistant",
      content: turn.assistantText,
      mode: turn.mode,
      rating: turn.rating,
      sources: turn.sources.length > 0 ? turn.sources : null,
    },
  ]);
  if (error) throw error;

  return id;
}

