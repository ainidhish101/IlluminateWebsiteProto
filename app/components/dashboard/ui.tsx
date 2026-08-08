/*
  Dashboard UI kit.

  These are the only building blocks the tab views use, so panels, tables, and
  status chips stay identical across sixteen screens. Everything is built from
  the site's existing tokens (paper / ink / pen / rule / marker) plus the two
  status colors added for this dashboard (good / flag), so light and dark mode
  come for free.

  Form atoms (Field, TextInput, SelectInput, TextArea, SubmitButton) are
  deliberately re-exported from `~/auth` rather than redefined — the auth modal
  and the dashboard should never drift apart.
*/

import { AlertTriangle, Inbox, Loader2, type LucideIcon } from "lucide-react";
import { isSupabaseConfigured } from "~/lib/supabase";
import {
  SUBMISSION_STATUS_LABEL,
  type SubmissionStatus,
  type TaskPriority,
} from "~/lib/roles";

export { Field, TextInput, SelectInput, TextArea, SubmitButton } from "~/auth";

/* ───────────────────────── page scaffolding ───────────────────────── */

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div className="min-w-0">
        {eyebrow && (
          <p className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-pen mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-ink-soft text-sm leading-relaxed mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-paper border border-rule rounded-xl shadow-[var(--shadow-rest)] ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-rule">
          <div className="min-w-0">
            {title && <h2 className="font-semibold text-ink text-base">{title}</h2>}
            {description && (
              <p className="text-ink-soft text-xs leading-relaxed mt-1 max-w-xl">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "pen",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: "pen" | "marker" | "good" | "flag";
}) {
  const toneClass = {
    pen: "text-pen bg-pen/10",
    marker: "text-marker-dim bg-marker/15",
    good: "text-good bg-good/12",
    flag: "text-flag bg-flag/12",
  }[tone];

  return (
    <div className="bg-paper border border-rule rounded-xl p-5 shadow-[var(--shadow-rest)]">
      <div className="flex items-start justify-between gap-3">
        <p className="course-code text-[0.65rem] uppercase tracking-wide text-ink-soft">{label}</p>
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${toneClass}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="font-display font-extrabold text-3xl text-ink tracking-tight mt-3 tabular-nums">
        {value}
      </p>
      {hint && <p className="text-ink-soft text-xs mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

/* ───────────────────────── chips ───────────────────────── */

type Tone = "neutral" | "pen" | "marker" | "good" | "flag";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "text-ink-soft bg-paper-dim border-rule",
  pen: "text-pen bg-pen/10 border-pen/25",
  marker: "text-marker-dim bg-marker/15 border-marker/40",
  good: "text-good bg-good/12 border-good/30",
  flag: "text-flag bg-flag/12 border-flag/30",
};

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 course-code text-[0.6rem] uppercase tracking-wide border rounded px-1.5 py-0.5 whitespace-nowrap ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<SubmissionStatus, Tone> = {
  pending_officer: "marker",
  changes_requested: "flag",
  pending_admin: "pen",
  approved: "good",
  rejected: "flag",
};

export function StatusPill({ status }: { status: SubmissionStatus }) {
  return <Chip tone={STATUS_TONE[status]}>{SUBMISSION_STATUS_LABEL[status]}</Chip>;
}

const PRIORITY_TONE: Record<TaskPriority, Tone> = {
  high: "flag",
  medium: "marker",
  low: "neutral",
};

export function PriorityTag({ priority }: { priority: TaskPriority }) {
  return <Chip tone={PRIORITY_TONE[priority]}>{priority}</Chip>;
}

/* ───────────────────────── buttons ───────────────────────── */

export function Button({
  variant = "primary",
  icon: Icon,
  busy,
  children,
  className = "",
  ...rest
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: LucideIcon;
  busy?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClass = {
    primary: "bg-pen-solid hover:bg-pen-solid-dim text-white border-transparent",
    secondary: "bg-paper hover:border-pen text-ink border-rule",
    ghost: "bg-transparent hover:bg-paper-dim text-ink-soft hover:text-ink border-transparent",
    danger: "bg-transparent hover:bg-flag/10 text-flag border-flag/30",
  }[variant];

  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 border rounded-lg text-sm font-semibold transition-colors disabled:opacity-55 disabled:cursor-not-allowed ${variantClass} ${className}`}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && <Icon className="w-4 h-4 shrink-0" />
      )}
      {children}
    </button>
  );
}

/* ───────────────────────── tables ───────────────────────── */

/** Horizontal scroll lives on the wrapper so the page body never scrolls sideways. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 sm:-mx-6 -mb-5 sm:-mb-6 overflow-x-auto">
      <table className="w-full min-w-[42rem] text-sm border-collapse">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`text-left course-code text-[0.62rem] uppercase tracking-wide text-ink-soft font-medium px-5 sm:px-6 py-3 border-b border-rule bg-paper-dim ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-5 sm:px-6 py-3.5 border-b border-rule align-middle ${className}`}>
      {children}
    </td>
  );
}

/* ───────────────────────── states ───────────────────────── */

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-ink-soft text-sm py-8 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> {label}…
    </p>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 text-sm text-ink bg-flag/10 border border-flag/30 rounded-lg px-3.5 py-2.5"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-flag" />
      <span>{message}</span>
    </p>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-paper-dim text-ink-soft mb-3.5">
        <Icon className="w-5 h-5" />
      </span>
      <p className="text-ink font-semibold text-sm">{title}</p>
      {description && (
        <p className="text-ink-soft text-sm leading-relaxed mt-1.5 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Shown in place of any data panel when the Supabase env vars are missing, so
 * a fresh clone explains itself instead of rendering empty tables.
 */
export function SetupNotice() {
  return (
    <div className="bg-marker/10 border border-marker/40 rounded-xl p-6">
      <p className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-marker-dim mb-2">
        Setup required
      </p>
      <h2 className="font-display font-extrabold text-2xl text-ink tracking-tight mb-2">
        Connect Supabase to switch this on.
      </h2>
      <p className="text-ink-soft text-sm leading-relaxed mb-4 max-w-xl">
        Add <code className="course-code text-ink">VITE_SUPABASE_URL</code> and{" "}
        <code className="course-code text-ink">VITE_SUPABASE_ANON_KEY</code> to a{" "}
        <code className="course-code text-ink">.env</code> file in the project root, run{" "}
        <code className="course-code text-ink">supabase/schema.sql</code> in the Supabase SQL
        editor, then restart the dev server. Until then accounts are stored locally in your
        browser and every dashboard panel stays empty.
      </p>
      <p className="text-ink-soft text-xs">
        See <code className="course-code text-ink">SUPABASE_SETUP.md</code> for the full checklist.
      </p>
    </div>
  );
}

/** Wraps a panel body: setup notice, spinner, error, or the real thing. */
export function DataBoundary({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  return <>{children}</>;
}

/* ───────────────────────── misc ───────────────────────── */

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function relativeTime(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** True when a due date has passed and the task isn't finished. */
export function isOverdue(dueDate: string | null, done: boolean): boolean {
  if (!dueDate || done) return false;
  return new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
}
