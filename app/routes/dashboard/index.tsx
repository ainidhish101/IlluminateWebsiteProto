/*
  Overview — the landing tab, assembled from whatever the signed-in role can
  actually see.

  A Member gets four personal numbers. An Associate gains their contribution
  row. An Officer gains their review queue. A Director gains the governance
  row. Each block only fetches when the role warrants it, so a Member's
  overview makes three requests, not nine.
*/

import { useMemo } from "react";
import { Link } from "react-router";
import {
  Activity,
  BadgeCheck,
  ClipboardCheck,
  Clock,
  GraduationCap,
  ListChecks,
  Send,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import {
  Chip,
  DataBoundary,
  EmptyState,
  PageHeader,
  Panel,
  StatTile,
  formatDate,
  isOverdue,
  relativeTime,
} from "~/components/dashboard/ui";
import { useAuth } from "~/auth";
import { useDashboard } from "~/lib/dashboardContext";
import { useQuery } from "~/lib/useQuery";
import {
  listAcademicRecords,
  listActivity,
  listAllSubmissions,
  listExtracurriculars,
  listGoals,
  listMyHours,
  listMySubmissions,
  listProfiles,
  listSubmissionsByCategory,
  listTasksFor,
  totalHours,
} from "~/lib/db";
import { ROLE_LABEL, roleAtLeast } from "~/lib/roles";
import { UNWEIGHTED_4_0, type GradeLetter } from "~/data/gpaSystems";

export default function OverviewTab() {
  const { user, role } = useDashboard();
  const isAssociate = roleAtLeast(role, "associate");
  const isOfficer = roleAtLeast(role, "officer");
  const isAdmin = roleAtLeast(role, "admin");

  const records = useQuery(() => listAcademicRecords(user.id), [user.id]);
  const activities = useQuery(() => listExtracurriculars(user.id), [user.id]);
  const goals = useQuery(() => listGoals(user.id), [user.id]);

  const tasks = useQuery(() => listTasksFor(user.id, role), [user.id, role], {
    enabled: isAssociate,
  });
  const hours = useQuery(() => listMyHours(user.id), [user.id], { enabled: isAssociate });
  const submissions = useQuery(() => listMySubmissions(user.id), [user.id], {
    enabled: isAssociate,
  });

  const queue = useQuery(
    () => listSubmissionsByCategory(user.officerCategory ?? ""),
    [user.officerCategory],
    { enabled: isOfficer && !!user.officerCategory },
  );

  const allSubmissions = useQuery(() => listAllSubmissions(), [], { enabled: isAdmin });
  const profiles = useQuery(() => listProfiles(), [], { enabled: isAdmin });
  const feed = useQuery(() => listActivity(8), [], { enabled: isAdmin });

  const gpa = useMemo(() => {
    let points = 0;
    let credits = 0;
    for (const record of records.data ?? []) {
      const value = UNWEIGHTED_4_0[record.grade as GradeLetter];
      if (value === undefined) continue;
      points += value * Number(record.credits);
      credits += Number(record.credits);
    }
    return credits > 0 ? (points / credits).toFixed(2) : "—";
  }, [records.data]);

  const activityHours = (activities.data ?? []).reduce(
    (sum, row) => sum + Number(row.hours || 0),
    0,
  );
  const openGoals = (goals.data ?? []).filter((goal) => goal.status !== "done").length;

  const openTasks = (tasks.data ?? []).filter((task) => task.status !== "done");
  const overdueTasks = openTasks.filter((task) => isOverdue(task.due_date, false));
  const awaitingOfficer = (queue.data ?? []).filter(
    (row) => row.status === "pending_officer",
  ).length;
  const awaitingAdmin = (allSubmissions.data ?? []).filter(
    (row) => row.status === "pending_admin",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={ROLE_LABEL[role]}
        title={`Welcome back, ${user.name.split(" ")[0]}.`}
        description="Everything you're tracking, and everything waiting on you, in one screen."
      />

      <section className="mb-6">
        <h2 className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-ink-soft mb-3">
          Your academics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Unweighted GPA"
            value={gpa}
            hint={`${(records.data ?? []).length} courses recorded`}
            icon={GraduationCap}
          />
          <StatTile
            label="Activity hours"
            value={activityHours.toLocaleString()}
            hint={`${(activities.data ?? []).length} activities`}
            icon={Trophy}
            tone="marker"
          />
          <StatTile
            label="Open goals"
            value={openGoals}
            hint={`${(goals.data ?? []).length} set in total`}
            icon={Target}
            tone="good"
          />
          <StatTile
            label="Bookmarked guides"
            value={<SavedCount />}
            hint="From the resource library"
            icon={ListChecks}
          />
        </div>
      </section>

      {isAssociate && (
        <section className="mb-6">
          <h2 className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Your contributions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Volunteer hours"
              value={totalHours(hours.data ?? []).toLocaleString()}
              hint="Awarded by Directors"
              icon={Clock}
              tone="good"
            />
            <StatTile
              label="Open tasks"
              value={openTasks.length}
              hint={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "Nothing overdue"}
              icon={ListChecks}
              tone={overdueTasks.length > 0 ? "flag" : "pen"}
            />
            <StatTile
              label="Guides submitted"
              value={(submissions.data ?? []).length}
              hint={`${(submissions.data ?? []).filter((s) => s.status === "approved").length} approved`}
              icon={Send}
              tone="marker"
            />
            <StatTile
              label="Awaiting review"
              value={
                (submissions.data ?? []).filter(
                  (s) => s.status === "pending_officer" || s.status === "pending_admin",
                ).length
              }
              hint="Sitting with an Officer or Director"
              icon={ClipboardCheck}
            />
          </div>
        </section>
      )}

      {isOfficer && (
        <section className="mb-6">
          <h2 className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Your review queue — {user.officerCategory ?? "no category assigned"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Waiting on you"
              value={awaitingOfficer}
              hint={user.officerCategory ?? "Ask a Director to assign your category"}
              icon={ClipboardCheck}
              tone={awaitingOfficer > 0 ? "flag" : "good"}
            />
            <StatTile
              label="In your category"
              value={(queue.data ?? []).length}
              hint="Every submission, all statuses"
              icon={Send}
            />
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="mb-6">
          <h2 className="course-code text-[0.65rem] uppercase tracking-[0.15em] text-ink-soft mb-3">
            Governance
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Awaiting approval"
              value={awaitingAdmin}
              hint="Cleared by an Officer, needs your sign-off"
              icon={BadgeCheck}
              tone={awaitingAdmin > 0 ? "flag" : "good"}
            />
            <StatTile
              label="People"
              value={(profiles.data ?? []).length}
              hint={`${(profiles.data ?? []).filter((p) => p.role !== "member").length} on the team`}
              icon={Users}
              tone="pen"
            />
            <StatTile
              label="Submissions"
              value={(allSubmissions.data ?? []).length}
              hint={`${(allSubmissions.data ?? []).filter((s) => s.status === "approved").length} published`}
              icon={Send}
              tone="marker"
            />
            <StatTile
              label="Officers assigned"
              value={(profiles.data ?? []).filter((p) => p.role === "officer").length}
              hint="One per category is the target"
              icon={ClipboardCheck}
              tone="good"
            />
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {isAssociate && (
          <Panel
            title="Next up"
            description="Your closest deadlines."
            action={
              <Link
                to="/dashboard/tasks"
                className="text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
              >
                All tasks →
              </Link>
            }
          >
            <DataBoundary loading={tasks.loading} error={tasks.error}>
              {openTasks.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="Nothing assigned right now."
                  description="Directors post tasks here as they come up."
                />
              ) : (
                <ul className="space-y-2.5">
                  {openTasks.slice(0, 5).map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start justify-between gap-3 border border-rule rounded-lg p-3.5 bg-paper-dim"
                    >
                      <div className="min-w-0">
                        <p className="text-ink font-semibold text-sm leading-snug">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <Chip tone={task.priority === "high" ? "flag" : "neutral"}>
                            {task.priority}
                          </Chip>
                          {task.due_date && (
                            <Chip tone={isOverdue(task.due_date, false) ? "flag" : "neutral"}>
                              {isOverdue(task.due_date, false) ? "Overdue · " : "Due "}
                              {formatDate(task.due_date)}
                            </Chip>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DataBoundary>
          </Panel>
        )}

        {isAdmin ? (
          <Panel
            title="Recent activity"
            action={
              <Link
                to="/dashboard/activity"
                className="text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
              >
                Full log →
              </Link>
            }
          >
            <DataBoundary loading={feed.loading} error={feed.error}>
              {(feed.data ?? []).length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="Nothing logged yet."
                  description="Submissions, approvals, role changes, and hour grants all appear here."
                />
              ) : (
                <ul className="space-y-3">
                  {(feed.data ?? []).map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-pen mt-2 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-ink text-sm leading-snug">{entry.detail}</p>
                        <p className="course-code text-[0.6rem] uppercase text-ink-soft mt-1">
                          {entry.action.replace(/_/g, " ")} · {relativeTime(entry.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DataBoundary>
          </Panel>
        ) : (
          <QuickLinks isAssociate={isAssociate} />
        )}
      </div>
    </>
  );
}

/** Bookmarks live in the auth context, not the database — read them from there. */
function SavedCount() {
  const { savedResources } = useAuth();
  return <>{savedResources.length}</>;
}

function QuickLinks({ isAssociate }: { isAssociate: boolean }) {
  const links = [
    { to: "/dashboard/academics", label: "Add this semester's courses", icon: GraduationCap },
    { to: "/dashboard/activities", label: "Log an activity or its hours", icon: Trophy },
    { to: "/dashboard/goals", label: "Set a goal for this month", icon: Target },
    { to: "/dashboard/resources", label: "Browse the guide library", icon: ListChecks },
    ...(isAssociate
      ? [{ to: "/dashboard/submit", label: "Submit a guide draft", icon: Send }]
      : []),
  ];

  return (
    <Panel title="Quick actions">
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="flex items-center gap-3 px-3.5 py-3 border border-rule rounded-lg text-sm text-ink hover:border-pen transition-colors"
            >
              <link.icon className="w-4 h-4 text-pen shrink-0" />
              <span className="flex-1">{link.label}</span>
              <span className="text-ink-soft" aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
