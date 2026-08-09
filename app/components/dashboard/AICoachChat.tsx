/*
  DELIVERABLE 3 — AI Coach chat widget.

  A floating launcher plus a slide-over panel, mounted once in the dashboard
  layout so the coach is reachable from every tab. It reads the student's own
  dashboard through the Edge Function, so the answers are grounded in real
  data rather than whatever they type into the box.

  Ratings render as structured cards — score bars, quick wins, missing-data
  prompts — because the function returns typed JSON rather than prose. Chat
  turns render as plain text.
*/

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowUp,
  Compass,
  ExternalLink,
  Gauge,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Target,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  askCoach,
  QUICK_ACTIONS,
  type ChatTurn,
  type CoachMode,
  type Rating,
} from "~/lib/coach";
import { isSupabaseConfigured } from "~/lib/supabase";
import { Chip } from "./ui";

const ACTION_ICONS: Record<string, LucideIcon> = {
  gauge: Gauge,
  compass: Compass,
  zap: Zap,
  target: Target,
};

let turnCounter = 0;
const nextTurnId = () => `turn_${Date.now().toString(36)}_${turnCounter++}`;

export function AICoachChat() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest turn in view as answers stream in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Only the text of prior turns goes back as history — rating payloads would
  // bloat the prompt without telling the model anything new.
  const history = useMemo(
    () => turns.map((turn) => ({ role: turn.role, content: turn.content })),
    [turns],
  );

  async function send(mode: CoachMode, message?: string, label?: string) {
    if (busy) return;
    const outbound = (message ?? draft).trim();
    if (mode === "chat" && !outbound) return;

    setError(null);
    setBusy(true);
    setDraft("");

    const shown = label ?? outbound;
    setTurns((prev) => [...prev, { id: nextTurnId(), role: "user", content: shown }]);

    try {
      const reply = await askCoach({
        mode,
        message: outbound,
        conversationId,
        history,
      });
      setConversationId(reply.conversationId);
      setTurns((prev) => [
        ...prev,
        {
          id: nextTurnId(),
          role: "assistant",
          content: reply.text,
          rating: reply.rating,
          sources: reply.sources,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The coach didn't respond.");
      // Drop the optimistic user turn so a retry doesn't duplicate it.
      setTurns((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setTurns([]);
    setConversationId(null);
    setError(null);
    setDraft("");
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 pl-4 pr-5 py-3.5 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold text-sm rounded-full shadow-[var(--shadow-hover)] transition-transform hover:-translate-y-0.5"
          aria-label="Open the AI academic coach"
        >
          <Sparkles className="w-4 h-4" />
          Ask your coach
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-chalkboard/50 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="AI academic coach"
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[30rem] bg-paper border-l border-rule flex flex-col shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-rule shrink-0">
              <div className="min-w-0">
                <p className="course-code text-[0.62rem] uppercase tracking-[0.15em] text-pen mb-1">
                  Illuminate coach
                </p>
                <h2 className="font-display font-extrabold text-xl text-ink tracking-tight leading-tight">
                  Your academic coach
                </h2>
                <p className="text-ink-soft text-xs leading-relaxed mt-1">
                  Reads your dashboard. Answers straight.
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {turns.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    aria-label="Start a new conversation"
                    className="p-2 text-ink-soft hover:text-ink transition-colors rounded-lg"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close coach"
                  className="p-2 text-ink-soft hover:text-ink transition-colors rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {!isSupabaseConfigured ? (
                <NotConfigured />
              ) : turns.length === 0 ? (
                <EmptyCoach />
              ) : (
                turns.map((turn) => <Turn key={turn.id} turn={turn} />)
              )}

              {busy && (
                <p className="flex items-center gap-2 text-ink-soft text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading your dashboard…
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 text-sm text-ink bg-flag/10 border border-flag/30 rounded-lg px-3.5 py-2.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-flag" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <div className="border-t border-rule px-5 py-4 shrink-0 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = ACTION_ICONS[action.icon] ?? Sparkles;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      disabled={busy || !isSupabaseConfigured}
                      onClick={() => send(action.mode, action.message, action.label)}
                      className="inline-flex items-center gap-1.5 course-code text-[0.6rem] uppercase tracking-wide px-2.5 py-1.5 border border-rule rounded-md text-ink-soft hover:text-ink hover:border-pen transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon className="w-3 h-3" />
                      {action.label}
                    </button>
                  );
                })}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  send("chat");
                }}
                className="relative"
              >
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send("chat");
                    }
                  }}
                  disabled={busy || !isSupabaseConfigured}
                  rows={2}
                  placeholder="Ask about your courses, activities, or what to do next…"
                  aria-label="Message the coach"
                  className="w-full resize-none pl-3.5 pr-12 py-3 bg-paper-dim border border-rule rounded-xl text-ink text-sm placeholder:text-ink-soft/60 focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20 transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim() || !isSupabaseConfigured}
                  aria-label="Send"
                  className="absolute right-2.5 bottom-3 p-2 bg-pen-solid hover:bg-pen-solid-dim disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </form>

              <p className="text-ink-soft text-[0.65rem] leading-relaxed">
                Coaching guidance, not an admissions guarantee. Always verify deadlines on the
                official site.
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/* ───────────────────────── turns ───────────────────────── */

function Turn({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] bg-pen-solid text-white text-sm leading-relaxed rounded-2xl rounded-br-sm px-3.5 py-2.5 whitespace-pre-wrap">
          {turn.content}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {turn.rating ? (
        <RatingCard rating={turn.rating} />
      ) : (
        <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">{turn.content}</p>
      )}

      {turn.sources && turn.sources.length > 0 && (
        <div className="border border-rule rounded-lg p-3.5 bg-paper-dim">
          <p className="course-code text-[0.6rem] uppercase text-ink-soft mb-2">Sources</p>
          <ul className="space-y-1.5">
            {turn.sources.slice(0, 6).map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 text-xs text-pen hover:text-pen-dim transition-colors"
                >
                  <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{source.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── rating card ───────────────────────── */

function toneFor(score: number, max: number): { bar: string; text: string } {
  const ratio = score / max;
  if (ratio >= 0.7) return { bar: "bg-good", text: "text-good" };
  if (ratio >= 0.45) return { bar: "bg-marker", text: "text-marker-dim" };
  return { bar: "bg-flag", text: "text-flag" };
}

function ScoreBar({
  label,
  score,
  max,
  rationale,
}: {
  label: string;
  score: number;
  max: number;
  rationale: string;
}) {
  const tone = toneFor(score, max);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <p className="course-code text-[0.62rem] uppercase tracking-wide text-ink-soft">{label}</p>
        <p className={`font-display font-extrabold text-sm tabular-nums ${tone.text}`}>
          {score}
          <span className="text-ink-soft font-sans font-normal text-xs">/{max}</span>
        </p>
      </div>
      <div
        className="h-1.5 w-full bg-rule/60 rounded-full overflow-hidden"
        role="img"
        aria-label={`${label}: ${score} out of ${max}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone.bar}`}
          style={{ width: `${(score / max) * 100}%` }}
        />
      </div>
      {rationale && (
        <p className="text-ink-soft text-xs leading-relaxed mt-1.5">{rationale}</p>
      )}
    </div>
  );
}

function RatingCard({ rating }: { rating: Rating }) {
  const overallTone = toneFor(rating.overall, 100);

  return (
    <div className="space-y-4">
      <div className="border border-rule rounded-xl p-5 bg-paper-dim">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="course-code text-[0.6rem] uppercase tracking-[0.15em] text-ink-soft mb-1">
              Overall profile strength
            </p>
            <p className={`font-display font-extrabold text-4xl tracking-tight ${overallTone.text}`}>
              {rating.overall}
              <span className="text-ink-soft font-sans font-normal text-base">/100</span>
            </p>
          </div>
          <Gauge className="w-5 h-5 text-ink-soft shrink-0 mt-1" />
        </div>

        <p className="text-ink text-sm leading-relaxed mb-5">{rating.summary}</p>

        <div className="space-y-4">
          <ScoreBar
            label="Academics & rigor"
            score={rating.subscores.academics.score}
            max={10}
            rationale={rating.subscores.academics.rationale}
          />
          <ScoreBar
            label="Extracurricular impact"
            score={rating.subscores.extracurriculars.score}
            max={10}
            rationale={rating.subscores.extracurriculars.rationale}
          />
          <ScoreBar
            label="Leadership & service"
            score={rating.subscores.leadership.score}
            max={10}
            rationale={rating.subscores.leadership.rationale}
          />
        </div>
      </div>

      {rating.quick_wins.length > 0 && (
        <div>
          <p className="course-code text-[0.6rem] uppercase tracking-[0.15em] text-ink-soft mb-2.5">
            Quick wins
          </p>
          <ol className="space-y-2">
            {rating.quick_wins.map((win, index) => (
              <li
                key={win.title}
                className="flex items-start gap-3 border border-rule rounded-lg p-3.5 bg-paper"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pen/10 text-pen course-code text-[0.65rem] font-semibold shrink-0">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-ink font-semibold text-sm leading-snug">{win.title}</p>
                  <p className="text-ink-soft text-xs leading-relaxed mt-1">{win.why}</p>
                  <span className="inline-block mt-2">
                    <Chip tone="pen">{win.effort}</Chip>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {rating.missing_data.length > 0 && (
        <div className="bg-marker/10 border border-marker/40 rounded-xl p-4">
          <p className="course-code text-[0.6rem] uppercase tracking-[0.15em] text-marker-dim mb-2">
            This rating is incomplete
          </p>
          <p className="text-ink-soft text-xs leading-relaxed mb-3">
            These sections are empty, so the scores above are less reliable than they could be.
          </p>
          <ul className="space-y-2.5">
            {rating.missing_data.map((gap) => (
              <li key={gap.section}>
                <p className="text-ink font-semibold text-sm">{gap.section}</p>
                <p className="text-ink-soft text-xs leading-relaxed mt-0.5">
                  {gap.why_it_matters}
                </p>
                <p className="course-code text-[0.6rem] uppercase text-marker-dim mt-1">
                  Fill in: {gap.where}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── empty & unconfigured ───────────────────────── */

function EmptyCoach() {
  return (
    <div className="text-center py-8 px-2">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pen/10 text-pen mb-4">
        <MessageSquare className="w-5 h-5" />
      </span>
      <p className="text-ink font-semibold text-sm mb-2">Ask anything about your profile.</p>
      <p className="text-ink-soft text-sm leading-relaxed max-w-xs mx-auto">
        The coach can see the courses, activities, hours, and goals on your dashboard — so ask
        the specific question, not the general one.
      </p>
      <ul className="mt-5 space-y-1.5 text-left max-w-xs mx-auto">
        {[
          "Is my course load rigorous enough for engineering?",
          "What's missing from my activities list?",
          "Should I do a summer program or a project?",
        ].map((example) => (
          <li key={example} className="text-ink-soft text-xs leading-relaxed">
            <span className="text-pen">→</span> {example}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="bg-marker/10 border border-marker/40 rounded-xl p-5">
      <p className="course-code text-[0.6rem] uppercase tracking-[0.15em] text-marker-dim mb-2">
        Setup required
      </p>
      <p className="text-ink font-semibold text-sm mb-2">The coach isn't connected yet.</p>
      <p className="text-ink-soft text-sm leading-relaxed">
        It needs Supabase plus the <code className="course-code text-ink">advisor-coach</code>{" "}
        Edge Function deployed with a Gemini API key. See{" "}
        <code className="course-code text-ink">AI_COACH_SETUP.md</code>.
      </p>
      <Link
        to="/dashboard/settings"
        className="inline-block mt-3 text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
      >
        Check connection status →
      </Link>
    </div>
  );
}
