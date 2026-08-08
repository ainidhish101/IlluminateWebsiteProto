/*
  Global activity & audit log (Director only).

  Rows are written by `logActivity` from every consequential mutation:
  submissions, review decisions, role changes, hour grants, task assignments.
  It is append-only — nothing in the app updates or deletes a log row, and the
  RLS policies don't grant those verbs to anyone.
*/

import { useMemo, useState } from "react";
import { Activity, BadgeCheck, Clock, Send, UserCog } from "lucide-react";
import {
  Chip,
  DataBoundary,
  EmptyState,
  PageHeader,
  Panel,
  StatTile,
  relativeTime,
} from "~/components/dashboard/ui";
import { RequireRole } from "~/components/dashboard/RequireRole";
import { useQuery } from "~/lib/useQuery";
import { displayName, indexProfiles, listActivity, listProfiles } from "~/lib/db";

const ENTITY_FILTERS = [
  { value: "all", label: "Everything" },
  { value: "guide", label: "Guides" },
  { value: "task", label: "Tasks" },
  { value: "volunteer_hours", label: "Hours" },
  { value: "profile", label: "Roles" },
];

const ENTITY_ICON: Record<string, typeof Activity> = {
  guide: Send,
  task: Send,
  volunteer_hours: Clock,
  profile: UserCog,
};

export default function ActivityTab() {
  return (
    <RequireRole minimum="admin">
      <ActivityContent />
    </RequireRole>
  );
}

function ActivityContent() {
  const feed = useQuery(() => listActivity(200), []);
  const profiles = useQuery(() => listProfiles(), []);
  const [entity, setEntity] = useState("all");

  const rows = feed.data ?? [];
  const people = useMemo(() => indexProfiles(profiles.data ?? []), [profiles.data]);

  const visible = useMemo(
    () => (entity === "all" ? rows : rows.filter((row) => row.entity === entity)),
    [rows, entity],
  );

  const today = rows.filter(
    (row) => new Date(row.created_at).toDateString() === new Date().toDateString(),
  ).length;
  const approvals = rows.filter((row) => row.action === "submission_approved").length;
  const grants = rows.filter((row) => row.action === "hours_granted").length;

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Activity & audit log"
        description="Every consequential action on the platform, newest first. Append-only — nothing here can be edited or removed."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile label="Events today" value={today} icon={Activity} />
        <StatTile label="Guides approved" value={approvals} icon={BadgeCheck} tone="good" />
        <StatTile label="Hour grants" value={grants} icon={Clock} tone="marker" />
      </div>

      <Panel
        title="Live feed"
        description={`${visible.length} event${visible.length === 1 ? "" : "s"} shown.`}
        action={
          <div className="flex flex-wrap gap-1.5">
            {ENTITY_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setEntity(option.value)}
                className={`course-code text-[0.62rem] uppercase tracking-wide px-2.5 py-1.5 rounded-md border transition-colors ${
                  entity === option.value
                    ? "bg-pen-solid text-white border-transparent"
                    : "border-rule text-ink-soft hover:text-ink hover:border-pen"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        <DataBoundary loading={feed.loading} error={feed.error}>
          {visible.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nothing logged yet."
              description="Submissions, approvals, role changes, and hour grants all write a line here."
            />
          ) : (
            <ol className="relative space-y-5 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-rule">
              {visible.map((row) => {
                const Icon = ENTITY_ICON[row.entity] ?? Activity;
                return (
                  <li key={row.id} className="relative">
                    <span className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full bg-paper border-2 border-pen" />
                    <div className="flex flex-wrap items-start gap-x-2.5 gap-y-1.5">
                      <Icon className="w-4 h-4 text-ink-soft shrink-0 mt-0.5" />
                      <p className="text-ink text-sm leading-snug flex-1 min-w-[12rem]">
                        {row.detail}
                      </p>
                      <Chip>{row.action.replace(/_/g, " ")}</Chip>
                    </div>
                    <p className="course-code text-[0.6rem] uppercase text-ink-soft mt-1.5 ml-6.5">
                      {displayName(people.get(row.actor_id ?? ""))} · {relativeTime(row.created_at)}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </DataBoundary>
      </Panel>
    </>
  );
}
