/*
  Task assignment hub (Director only).

  A task goes to exactly one target: a named person, or an entire tier. The
  form makes that an either/or choice rather than two independent fields,
  because "assigned to everyone AND to Priya" has no sensible meaning on the
  receiving end.
*/

import { useMemo, useState } from "react";
import { Megaphone, Send, Trash2, Users } from "lucide-react";
import {
  Button,
  Chip,
  DataBoundary,
  EmptyState,
  ErrorNote,
  Field,
  PageHeader,
  Panel,
  PriorityTag,
  SelectInput,
  StatTile,
  TableWrap,
  Td,
  Th,
  TextArea,
  TextInput,
  formatDate,
  isOverdue,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import {
  createTask,
  deleteTask,
  displayName,
  indexProfiles,
  listAllTasks,
  listProfiles,
  type TaskRow,
} from "~/lib/db";
import {
  GUIDE_CATEGORIES,
  ROLES,
  ROLE_LABEL,
  TASK_PRIORITIES,
  TASK_STATUS_LABEL,
  type Role,
  type TaskPriority,
} from "~/lib/roles";

export default function AssignTab() {
  return (
    <RequireRole minimum="admin">
      <AssignContent />
    </RequireRole>
  );
}

function AssignContent() {
  const { user } = useDashboard();
  const tasks = useQuery(() => listAllTasks(), []);
  const profiles = useQuery(() => listProfiles(), []);

  const rows = tasks.data ?? [];
  const people = useMemo(() => indexProfiles(profiles.data ?? []), [profiles.data]);

  const open = rows.filter((task) => task.status !== "done");
  const overdue = open.filter((task) => isOverdue(task.due_date, false));
  const broadcasts = rows.filter((task) => task.assigned_role);

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Task assignment"
        description="Dispatch work to one person or a whole tier. Everything you create here appears on their Tasks & Events board immediately."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile label="Open tasks" value={open.length} icon={Send} />
        <StatTile
          label="Overdue"
          value={overdue.length}
          hint={overdue.length === 0 ? "Nothing late" : "Past their due date"}
          icon={Megaphone}
          tone={overdue.length > 0 ? "flag" : "good"}
        />
        <StatTile
          label="Tier broadcasts"
          value={broadcasts.length}
          hint="Sent to a whole role at once"
          icon={Users}
          tone="marker"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem] items-start">
        <Panel title="All assigned work" description="Newest first, across every tier.">
          <DataBoundary loading={tasks.loading} error={tasks.error}>
            {rows.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No tasks assigned yet."
                description="Create one with the form beside this panel."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Task</Th>
                    <Th>Assigned to</Th>
                    <Th>Priority</Th>
                    <Th>Due</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((task) => (
                    <AssignedRow
                      key={task.id}
                      task={task}
                      assigneeName={
                        task.assigned_role
                          ? `All ${ROLE_LABEL[task.assigned_role]}s`
                          : displayName(people.get(task.assigned_to ?? ""))
                      }
                      onChanged={tasks.reload}
                    />
                  ))}
                </tbody>
              </TableWrap>
            )}
          </DataBoundary>
        </Panel>

        <NewTaskForm
          createdBy={user.id}
          people={profiles.data ?? []}
          onCreated={tasks.reload}
        />
      </div>
    </>
  );
}

function AssignedRow({
  task,
  assigneeName,
  onChanged,
}: {
  task: TaskRow;
  assigneeName: string;
  onChanged: () => void;
}) {
  const { busy, run } = useMutation();
  const late = isOverdue(task.due_date, task.status === "done");

  return (
    <tr>
      <Td>
        <p className="text-ink font-medium">{task.title}</p>
        {task.category && (
          <span className="inline-block mt-1.5">
            <Chip tone="pen">{task.category}</Chip>
          </span>
        )}
      </Td>
      <Td className="text-ink-soft">
        {task.assigned_role ? <Chip tone="marker">{assigneeName}</Chip> : assigneeName}
      </Td>
      <Td>
        <PriorityTag priority={task.priority} />
      </Td>
      <Td className={`whitespace-nowrap ${late ? "text-flag font-medium" : "text-ink-soft"}`}>
        {formatDate(task.due_date)}
      </Td>
      <Td>
        <Chip tone={task.status === "done" ? "good" : "neutral"}>
          {TASK_STATUS_LABEL[task.status]}
        </Chip>
      </Td>
      <Td className="text-right">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await run(() => deleteTask(task.id))) onChanged();
          }}
          aria-label={`Delete task: ${task.title}`}
          className="p-1.5 text-ink-soft hover:text-flag transition-colors rounded disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </Td>
    </tr>
  );
}

type Target = { kind: "person"; id: string } | { kind: "role"; role: Role };

function NewTaskForm({
  createdBy,
  people,
  onCreated,
}: {
  createdBy: string;
  people: { id: string; full_name: string | null; email: string; role: Role }[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  // Encoded as "role:associate" or "person:<uuid>" so one select drives both.
  const [target, setTarget] = useState("role:associate");
  const { busy, error, setError, run } = useMutation();

  const parsed: Target = useMemo(() => {
    const [kind, value] = target.split(":");
    return kind === "role"
      ? { kind: "role", role: value as Role }
      : { kind: "person", id: value };
  }, [target]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 4) {
      setError("Give the task a title the assignee will understand out of context.");
      return;
    }
    const ok = await run(() =>
      createTask({
        assigned_to: parsed.kind === "person" ? parsed.id : null,
        assigned_role: parsed.kind === "role" ? parsed.role : null,
        created_by: createdBy,
        title: title.trim(),
        detail: detail.trim() || null,
        priority,
        due_date: dueDate || null,
        category: category || null,
      }),
    );
    if (!ok) return;
    setTitle("");
    setDetail("");
    setDueDate("");
    onCreated();
  }

  return (
    <Panel title="Assign a task" className="xl:sticky xl:top-24">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote message={error} />}

        <Field label="Task" htmlFor="task-title">
          <TextInput
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Draft the summer programs guide"
          />
        </Field>

        <Field label="Detail" htmlFor="task-detail" hint="Optional — scope, links, what 'done' means.">
          <TextArea
            id="task-detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            className="min-h-[5rem]"
          />
        </Field>

        <Field
          label="Assign to"
          htmlFor="task-target"
          hint="Pick a tier to broadcast, or one person to make it theirs."
        >
          <SelectInput
            id="task-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <optgroup label="Whole tier">
              {ROLES.map((role) => (
                <option key={role} value={`role:${role}`}>
                  All {ROLE_LABEL[role]}s
                </option>
              ))}
            </optgroup>
            <optgroup label="One person">
              {people.map((person) => (
                <option key={person.id} value={`person:${person.id}`}>
                  {person.full_name?.trim() || person.email} · {ROLE_LABEL[person.role]}
                </option>
              ))}
            </optgroup>
          </SelectInput>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority" htmlFor="task-priority">
            <SelectInput
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Due date" htmlFor="task-due">
            <TextInput
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Category" htmlFor="task-category" hint="Optional.">
          <SelectInput
            id="task-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">No category</option>
            {GUIDE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Button type="submit" icon={Send} busy={busy} className="w-full">
          Assign task
        </Button>
      </form>
    </Panel>
  );
}
