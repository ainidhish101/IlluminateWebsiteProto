/*
  Task & event board (Associate+).

  Shows tasks aimed at this user directly plus broadcasts to their whole tier.
  Overdue is computed against local midnight so a task due today never reads
  as late.
*/

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Circle, ListChecks, Timer } from "lucide-react";
import {
  Chip,
  DataBoundary,
  EmptyState,
  PageHeader,
  Panel,
  PriorityTag,
  StatTile,
  formatDate,
  isOverdue,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import { listTasksFor, setTaskStatus, type TaskRow } from "~/lib/db";
import { TASK_PRIORITIES, type TaskStatus } from "~/lib/roles";

type Filter = "open" | "done" | "all";

export default function TasksTab() {
  return (
    <RequireRole minimum="associate">
      <TasksContent />
    </RequireRole>
  );
}

function TasksContent() {
  const { user, role } = useDashboard();
  const tasks = useQuery(() => listTasksFor(user.id, role), [user.id, role]);
  const rows = tasks.data ?? [];
  const [filter, setFilter] = useState<Filter>("open");

  const visible = useMemo(() => {
    const filtered =
      filter === "all"
        ? rows
        : rows.filter((task) => (filter === "done" ? task.status === "done" : task.status !== "done"));
    // High priority first, then by due date, undated last.
    const rank = (task: TaskRow) => TASK_PRIORITIES.indexOf(task.priority);
    return [...filtered].sort((a, b) => {
      if (a.status !== b.status) return a.status === "done" ? 1 : -1;
      const byPriority = rank(a) - rank(b);
      if (byPriority !== 0) return byPriority;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  }, [rows, filter]);

  const open = rows.filter((task) => task.status !== "done");
  const overdue = open.filter((task) => isOverdue(task.due_date, false));
  const highPriority = open.filter((task) => task.priority === "high");

  return (
    <>
      <PageHeader
        eyebrow="Contribute"
        title="Tasks & events"
        description="Work assigned to you personally, plus anything a Director sent to your whole tier."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile label="Open" value={open.length} icon={ListChecks} />
        <StatTile
          label="High priority"
          value={highPriority.length}
          hint="Do these first"
          icon={Timer}
          tone="marker"
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          hint={overdue.length === 0 ? "All clear" : "Past their due date"}
          icon={CalendarClock}
          tone={overdue.length > 0 ? "flag" : "good"}
        />
      </div>

      <Panel
        title="Your board"
        action={
          <div className="flex flex-wrap gap-1.5">
            {(["open", "done", "all"] as Filter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`course-code text-[0.62rem] uppercase tracking-wide px-2.5 py-1.5 rounded-md border transition-colors ${
                  filter === option
                    ? "bg-pen-solid text-white border-transparent"
                    : "border-rule text-ink-soft hover:text-ink hover:border-pen"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        }
      >
        <DataBoundary loading={tasks.loading} error={tasks.error}>
          {visible.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={filter === "done" ? "Nothing finished yet." : "No tasks on your board."}
              description="Directors assign work from the Task Assignment tab. Anything aimed at your role lands here automatically."
            />
          ) : (
            <ul className="space-y-2.5">
              {visible.map((task) => (
                <TaskCard key={task.id} task={task} onChanged={tasks.reload} />
              ))}
            </ul>
          )}
        </DataBoundary>
      </Panel>
    </>
  );
}

function TaskCard({ task, onChanged }: { task: TaskRow; onChanged: () => void }) {
  const { busy, run } = useMutation();
  const done = task.status === "done";
  const late = isOverdue(task.due_date, done);

  async function cycle(next: TaskStatus) {
    if (await run(() => setTaskStatus(task.id, next))) onChanged();
  }

  return (
    <li
      className={`border rounded-lg p-4 transition-colors ${
        late ? "border-flag/40 bg-flag/5" : "border-rule bg-paper-dim"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => cycle(done ? "todo" : "done")}
          aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} complete`}
          aria-pressed={done}
          className={`mt-0.5 shrink-0 transition-colors disabled:opacity-50 ${
            done ? "text-good" : "text-ink-soft hover:text-pen"
          }`}
        >
          {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold text-sm leading-snug ${
              done ? "text-ink-soft line-through" : "text-ink"
            }`}
          >
            {task.title}
          </p>
          {task.detail && (
            <p className="text-ink-soft text-sm leading-relaxed mt-1.5">{task.detail}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <PriorityTag priority={task.priority} />
            {task.category && <Chip tone="pen">{task.category}</Chip>}
            {task.due_date && (
              <Chip tone={late ? "flag" : "neutral"}>
                {late ? "Overdue · " : "Due "}
                {formatDate(task.due_date)}
              </Chip>
            )}
            {task.assigned_role && <Chip>All {task.assigned_role}s</Chip>}
          </div>
        </div>

        {!done && (
          <button
            type="button"
            disabled={busy}
            onClick={() => cycle(task.status === "in_progress" ? "todo" : "in_progress")}
            className={`shrink-0 course-code text-[0.6rem] uppercase tracking-wide px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
              task.status === "in_progress"
                ? "bg-pen/10 border-pen/25 text-pen"
                : "border-rule text-ink-soft hover:text-ink hover:border-pen"
            }`}
          >
            {task.status === "in_progress" ? "In progress" : "Start"}
          </button>
        )}
      </div>
    </li>
  );
}
