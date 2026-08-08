/*
  Google Calendar tab.

  The embed points at whatever calendar id sits in VITE_GOOGLE_CALENDAR_ID.
  That calendar has to be shared publicly ("Make available to public") for the
  iframe to render for signed-in students — Google's embed does not carry our
  session.

  Alongside it sits a live list of deadlines the dashboard already knows about
  (tasks and goals), because those never make it into a shared org calendar.
*/

import { useMemo } from "react";
import { CalendarDays, ExternalLink, Flag, Target } from "lucide-react";
import {
  Chip,
  DataBoundary,
  EmptyState,
  PageHeader,
  Panel,
  formatDate,
  isOverdue,
} from "~/components/dashboard/ui";
import { useDashboard } from "~/lib/dashboardContext";
import { useQuery } from "~/lib/useQuery";
import { listGoals, listTasksFor } from "~/lib/db";
import { roleAtLeast } from "~/lib/roles";

const CALENDAR_ID = import.meta.env.VITE_GOOGLE_CALENDAR_ID as string | undefined;

type Upcoming = {
  id: string;
  title: string;
  date: string;
  kind: "task" | "goal";
  overdue: boolean;
};

export default function CalendarTab() {
  const { user, role } = useDashboard();
  const canHaveTasks = roleAtLeast(role, "associate");

  const goals = useQuery(() => listGoals(user.id), [user.id]);
  const tasks = useQuery(() => listTasksFor(user.id, role), [user.id, role], {
    enabled: canHaveTasks,
  });

  const upcoming = useMemo<Upcoming[]>(() => {
    const items: Upcoming[] = [];
    for (const goal of goals.data ?? []) {
      if (!goal.target_date || goal.status === "done") continue;
      items.push({
        id: goal.id,
        title: goal.title,
        date: goal.target_date,
        kind: "goal",
        overdue: isOverdue(goal.target_date, false),
      });
    }
    for (const task of tasks.data ?? []) {
      if (!task.due_date || task.status === "done") continue;
      items.push({
        id: task.id,
        title: task.title,
        date: task.due_date,
        kind: "task",
        overdue: isOverdue(task.due_date, false),
      });
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [goals.data, tasks.data]);

  const embedSrc = CALENDAR_ID
    ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
        CALENDAR_ID,
      )}&ctz=America%2FChicago&mode=MONTH&showTitle=0&showPrint=0&showTabs=1&showCalendars=0`
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Calendar"
        description="Organization events on the left, your own deadlines on the right."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem] items-start">
        <Panel
          title="Illuminate events"
          action={
            embedSrc && (
              <a
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(CALENDAR_ID!)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
              >
                Add to your calendar <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )
          }
        >
          {embedSrc ? (
            <div className="rounded-lg overflow-hidden border border-rule">
              <iframe
                title="Illuminate organization calendar"
                src={embedSrc}
                className="w-full h-[36rem] block"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No calendar connected yet."
              description="Set VITE_GOOGLE_CALENDAR_ID in your .env file to the organization calendar's id, make that calendar public, then restart the dev server."
            />
          )}
        </Panel>

        <Panel
          title="Your deadlines"
          description="Pulled from your goals and assigned tasks — not from Google."
          className="xl:sticky xl:top-24"
        >
          <DataBoundary
            loading={goals.loading || tasks.loading}
            error={goals.error ?? tasks.error}
          >
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nothing scheduled."
                description="Goals and tasks with a date on them show up here automatically."
              />
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="flex items-start gap-3 border border-rule rounded-lg p-3.5 bg-paper-dim"
                  >
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                        item.kind === "task"
                          ? "bg-pen/10 text-pen"
                          : "bg-marker/15 text-marker-dim"
                      }`}
                    >
                      {item.kind === "task" ? (
                        <Flag className="w-4 h-4" />
                      ) : (
                        <Target className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-ink font-semibold text-sm leading-snug">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Chip tone={item.overdue ? "flag" : "neutral"}>
                          {item.overdue ? "Overdue · " : ""}
                          {formatDate(item.date)}
                        </Chip>
                        <Chip>{item.kind}</Chip>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DataBoundary>
        </Panel>
      </div>
    </>
  );
}
