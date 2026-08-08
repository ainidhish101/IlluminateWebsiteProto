/*
  Extracurricular tracker — activities grouped by category, with positions,
  hours, and achievements.

  Category totals sit above the list because "how many hours in Community
  Service" is the number these get pulled out for on applications.
*/

import { useMemo, useState } from "react";
import { Clock3, Plus, Tag, Trash2, Trophy } from "lucide-react";
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
} from "~/components/dashboard/ui";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import {
  addExtracurricular,
  deleteExtracurricular,
  listExtracurriculars,
  type ExtracurricularRow,
} from "~/lib/db";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "~/lib/roles";

export default function ActivitiesTab() {
  const { user } = useDashboard();
  const activities = useQuery(() => listExtracurriculars(user.id), [user.id]);
  const rows = activities.data ?? [];

  const { totalHours, byCategory } = useMemo(() => {
    const groups = new Map<string, ExtracurricularRow[]>();
    let hours = 0;
    for (const row of rows) {
      hours += Number(row.hours || 0);
      const list = groups.get(row.category) ?? [];
      list.push(row);
      groups.set(row.category, list);
    }
    return { totalHours: hours, byCategory: [...groups.entries()] };
  }, [rows]);

  const leadershipCount = rows.filter((row) => row.position?.trim()).length;

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Extracurriculars"
        description="Every activity, the role you held in it, and the hours behind it — in one place you can copy from later."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile label="Activities" value={rows.length} icon={Trophy} />
        <StatTile
          label="Total hours"
          value={totalHours.toLocaleString()}
          hint="Across every category"
          icon={Clock3}
          tone="marker"
        />
        <StatTile
          label="Positions held"
          value={leadershipCount}
          hint="Activities where you listed a title"
          icon={Tag}
          tone="good"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] items-start">
        <Panel title="Your activities" description="Grouped by category, newest first.">
          <DataBoundary loading={activities.loading} error={activities.error}>
            {rows.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No activities recorded."
                description="Add the clubs, sports, jobs, and projects you're part of — even the ones you think are too small to count."
              />
            ) : (
              <div className="space-y-7">
                {byCategory.map(([category, categoryRows]) => {
                  const categoryHours = categoryRows.reduce(
                    (sum, row) => sum + Number(row.hours || 0),
                    0,
                  );
                  return (
                    <div key={category}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-ink text-sm">{category}</h3>
                        <p className="course-code text-[0.65rem] uppercase text-ink-soft">
                          {categoryHours.toLocaleString()} hrs
                        </p>
                      </div>
                      <ul className="space-y-2.5">
                        {categoryRows.map((row) => (
                          <ActivityCard
                            key={row.id}
                            row={row}
                            onChanged={activities.reload}
                          />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </DataBoundary>
        </Panel>

        <AddActivityForm userId={user.id} onAdded={activities.reload} />
      </div>
    </>
  );
}

function ActivityCard({ row, onChanged }: { row: ExtracurricularRow; onChanged: () => void }) {
  const { busy, run } = useMutation();

  return (
    <li className="border border-rule rounded-lg p-4 bg-paper-dim">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink font-semibold text-sm">{row.activity_name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {row.position && <Chip tone="pen">{row.position}</Chip>}
            <Chip>{Number(row.hours || 0).toLocaleString()} hrs</Chip>
          </div>
          {row.achievements && (
            <p className="text-ink-soft text-sm leading-relaxed mt-2.5">{row.achievements}</p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await run(() => deleteExtracurricular(row.id))) onChanged();
          }}
          aria-label={`Remove ${row.activity_name}`}
          className="p-1.5 text-ink-soft hover:text-flag transition-colors rounded shrink-0 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

function AddActivityForm({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ActivityCategory>(ACTIVITY_CATEGORIES[0]);
  const [position, setPosition] = useState("");
  const [hours, setHours] = useState("0");
  const [achievements, setAchievements] = useState("");
  const { busy, error, setError, run } = useMutation();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Give the activity a name.");
      return;
    }
    const hoursValue = Number(hours);
    if (!Number.isFinite(hoursValue) || hoursValue < 0) {
      setError("Hours must be zero or more.");
      return;
    }
    const ok = await run(() =>
      addExtracurricular({
        user_id: userId,
        category,
        activity_name: name.trim(),
        position: position.trim() || null,
        hours: hoursValue,
        achievements: achievements.trim() || null,
      }),
    );
    if (!ok) return;
    setName("");
    setPosition("");
    setHours("0");
    setAchievements("");
    onAdded();
  }

  return (
    <Panel title="Add an activity" className="lg:sticky lg:top-24">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote message={error} />}
        <Field label="Activity" htmlFor="activity-name">
          <TextInput
            id="activity-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marching band"
          />
        </Field>
        <Field label="Category" htmlFor="activity-category">
          <SelectInput
            id="activity-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ActivityCategory)}
          >
            {ACTIVITY_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Position" htmlFor="activity-position">
            <TextInput
              id="activity-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Section leader"
            />
          </Field>
          <Field label="Hours" htmlFor="activity-hours">
            <TextInput
              id="activity-hours"
              type="number"
              min="0"
              step="1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Achievements"
          htmlFor="activity-achievements"
          hint="Optional — awards, results, what you actually built."
        >
          <TextArea
            id="activity-achievements"
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
            rows={3}
            className="min-h-[5rem]"
          />
        </Field>
        <Button type="submit" icon={Plus} busy={busy} className="w-full">
          Add activity
        </Button>
      </form>
    </Panel>
  );
}
