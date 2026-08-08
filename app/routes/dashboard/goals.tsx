/*
  Personal goals — a three-column board (Not started / In progress / Done)
  with a short-term vs long-term filter.

  Cards move with explicit buttons rather than drag-and-drop: it works on a
  phone, it works with a keyboard, and it doesn't need a drag library.
*/

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  Target,
  Timer,
  Trash2,
} from "lucide-react";
import {
  Button,
  Chip,
  DataBoundary,
  EmptyState,
  ErrorNote,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  StatTile,
  TextArea,
  TextInput,
  formatDate,
} from "~/components/dashboard/ui";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import { addGoal, deleteGoal, listGoals, setGoalStatus, type GoalRow } from "~/lib/db";
import type { GoalHorizon, GoalStatus } from "~/lib/roles";

const COLUMNS: { status: GoalStatus; label: string }[] = [
  { status: "not_started", label: "Not started" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

const HORIZON_LABEL: Record<GoalHorizon, string> = {
  short_term: "Short term",
  long_term: "Long term",
};

type HorizonFilter = GoalHorizon | "all";

export default function GoalsTab() {
  const { user } = useDashboard();
  const goals = useQuery(() => listGoals(user.id), [user.id]);
  const rows = goals.data ?? [];
  const [horizon, setHorizon] = useState<HorizonFilter>("all");

  const visible = useMemo(
    () => (horizon === "all" ? rows : rows.filter((row) => row.horizon === horizon)),
    [rows, horizon],
  );

  const done = rows.filter((row) => row.status === "done").length;
  const active = rows.filter((row) => row.status === "in_progress").length;

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Personal goals"
        description="Break the year into things you can actually finish, then move them across as they happen."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile label="Open goals" value={rows.length - done} icon={Target} />
        <StatTile label="In progress" value={active} icon={Timer} tone="marker" />
        <StatTile
          label="Completed"
          value={done}
          hint={rows.length > 0 ? `${Math.round((done / rows.length) * 100)}% of everything set` : undefined}
          icon={CheckCircle2}
          tone="good"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] items-start">
        <Panel
          title="Goal board"
          action={
            <div className="flex flex-wrap gap-1.5">
              {(["all", "short_term", "long_term"] as HorizonFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setHorizon(option)}
                  className={`course-code text-[0.62rem] uppercase tracking-wide px-2.5 py-1.5 rounded-md border transition-colors ${
                    horizon === option
                      ? "bg-pen-solid text-white border-transparent"
                      : "border-rule text-ink-soft hover:text-ink hover:border-pen"
                  }`}
                >
                  {option === "all" ? "All" : HORIZON_LABEL[option]}
                </button>
              ))}
            </div>
          }
        >
          <DataBoundary loading={goals.loading} error={goals.error}>
            {rows.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No goals set."
                description="Start with one small enough to finish this month, and one big enough to matter by graduation."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {COLUMNS.map((column) => {
                  const columnGoals = visible.filter((row) => row.status === column.status);
                  return (
                    <div key={column.status} className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="course-code text-[0.65rem] uppercase tracking-wide text-ink-soft">
                          {column.label}
                        </h3>
                        <span className="course-code text-[0.65rem] text-ink-soft tabular-nums">
                          {columnGoals.length}
                        </span>
                      </div>
                      <ul className="space-y-2.5">
                        {columnGoals.map((row) => (
                          <GoalCard key={row.id} row={row} onChanged={goals.reload} />
                        ))}
                        {columnGoals.length === 0 && (
                          <li className="border border-dashed border-rule rounded-lg py-6 text-center text-ink-soft text-xs">
                            Nothing here
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </DataBoundary>
        </Panel>

        <AddGoalForm userId={user.id} onAdded={goals.reload} />
      </div>
    </>
  );
}

function GoalCard({ row, onChanged }: { row: GoalRow; onChanged: () => void }) {
  const { busy, run } = useMutation();
  const index = COLUMNS.findIndex((column) => column.status === row.status);

  async function move(direction: -1 | 1) {
    const next = COLUMNS[index + direction];
    if (!next) return;
    if (await run(() => setGoalStatus(row.id, next.status))) onChanged();
  }

  return (
    <li className="border border-rule rounded-lg p-3.5 bg-paper-dim">
      <p
        className={`text-ink font-semibold text-sm leading-snug ${
          row.status === "done" ? "line-through text-ink-soft" : ""
        }`}
      >
        {row.title}
      </p>
      {row.detail && (
        <p className="text-ink-soft text-xs leading-relaxed mt-1.5">{row.detail}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <Chip tone={row.horizon === "long_term" ? "pen" : "neutral"}>
          {HORIZON_LABEL[row.horizon]}
        </Chip>
        {row.target_date && <Chip tone="marker">{formatDate(row.target_date)}</Chip>}
      </div>
      <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-rule">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={busy || index === 0}
            onClick={() => move(-1)}
            aria-label="Move back"
            className="p-1.5 text-ink-soft hover:text-ink transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={busy || index === COLUMNS.length - 1}
            onClick={() => move(1)}
            aria-label="Move forward"
            className="p-1.5 text-ink-soft hover:text-pen transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await run(() => deleteGoal(row.id))) onChanged();
          }}
          aria-label={`Delete goal: ${row.title}`}
          className="p-1.5 text-ink-soft hover:text-flag transition-colors rounded disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

function AddGoalForm({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("short_term");
  const [targetDate, setTargetDate] = useState("");
  const { busy, error, setError, run } = useMutation();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 3) {
      setError("Give the goal a title you'd recognize in a month.");
      return;
    }
    const ok = await run(() =>
      addGoal({
        user_id: userId,
        title: title.trim(),
        detail: detail.trim() || null,
        horizon,
        target_date: targetDate || null,
      }),
    );
    if (!ok) return;
    setTitle("");
    setDetail("");
    setTargetDate("");
    onAdded();
  }

  return (
    <Panel title="Add a goal" className="lg:sticky lg:top-24">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote message={error} />}
        <Field label="Goal" htmlFor="goal-title">
          <TextInput
            id="goal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Finish the Common App personal essay"
          />
        </Field>
        <Field label="Detail" htmlFor="goal-detail" hint="Optional — the first step, usually.">
          <TextArea
            id="goal-detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            className="min-h-[5rem]"
          />
        </Field>
        <Field label="Horizon" htmlFor="goal-horizon">
          <SelectInput
            id="goal-horizon"
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
          >
            <option value="short_term">Short term</option>
            <option value="long_term">Long term</option>
          </SelectInput>
        </Field>
        <Field label="Target date" htmlFor="goal-date" hint="Optional.">
          <TextInput
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </Field>
        <Button type="submit" icon={Plus} busy={busy} className="w-full">
          Add goal
        </Button>
      </form>
    </Panel>
  );
}
