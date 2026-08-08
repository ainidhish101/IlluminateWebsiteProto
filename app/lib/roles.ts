/*
  Role hierarchy, guide categories, and the sidebar tab manifest.

  This module is the single source of truth for "who can see what". The
  sidebar, the route guards, and the Supabase RLS policies all describe the
  same four tiers:

    member  <  associate  <  officer  <  admin

  Every tier inherits the tabs of the tiers below it, so `minRole` on a tab is
  a floor, not an exact match.
*/

export const ROLES = ["member", "associate", "officer", "admin"] as const;

export type Role = (typeof ROLES)[number];

/** Higher number = more access. Used for all `>=` comparisons. */
const RANK: Record<Role, number> = {
  member: 0,
  associate: 1,
  officer: 2,
  admin: 3,
};

/** Badge text shown next to the user's name in the dashboard header. */
export const ROLE_LABEL: Record<Role, string> = {
  member: "MEMBER",
  associate: "ASSOCIATE",
  officer: "OFFICER",
  admin: "DIRECTOR",
};

export const ROLE_BLURB: Record<Role, string> = {
  member: "Track your own academics, activities, and goals.",
  associate: "Write guides, take on tasks, and earn volunteer hours.",
  officer: "Review Associate submissions in your assigned category.",
  admin: "Full command over roles, approvals, hours, and tasks.",
};

export function roleAtLeast(role: Role | null | undefined, minimum: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[minimum];
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Normalizes anything coming out of the database into a known role. */
export function toRole(value: unknown): Role {
  return isRole(value) ? value : "member";
}

/* ───────────────────────── guide categories ───────────────────────── */

/*
  Categories an Associate can file a guide under, and the pool an Admin picks
  from when assigning an Officer. Officers only ever see submissions whose
  `category` matches their `officer_category`, so these strings must match
  exactly between the two — edit this list and nowhere else.
*/
export const GUIDE_CATEGORIES = [
  "Extracurriculars",
  "Arts & Performance",
  "Academics",
  "Standardized Testing",
  "Lifestyle",
  "College Prep",
  "Summer Planning",
] as const;

export type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

/** Categories used by the personal extracurricular tracker (a separate taxonomy). */
export const ACTIVITY_CATEGORIES = [
  "Arts & Performance",
  "STEM",
  "Athletics",
  "Community Service",
  "Leadership",
  "Academic Competition",
  "Work & Internships",
  "Other",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/* ───────────────────────── statuses & priorities ───────────────────────── */

export const SUBMISSION_STATUSES = [
  "pending_officer",
  "changes_requested",
  "pending_admin",
  "approved",
  "rejected",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending_officer: "Pending Officer Review",
  changes_requested: "Changes Requested",
  pending_admin: "Pending Admin Approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const TASK_PRIORITIES = ["high", "medium", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const GOAL_HORIZONS = ["short_term", "long_term"] as const;
export type GoalHorizon = (typeof GOAL_HORIZONS)[number];

export const GOAL_STATUSES = ["not_started", "in_progress", "done"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/* ───────────────────────── sidebar manifest ───────────────────────── */

export type TabDef = {
  /** Path segment under /dashboard. Empty string is the index tab. */
  to: string;
  label: string;
  /** lucide-react icon name, resolved in the Sidebar. */
  icon: string;
  minRole: Role;
  /** Sidebar section heading this tab sits under. */
  group: "Personal" | "Contribute" | "Review" | "Governance";
};

export const TABS: TabDef[] = [
  { to: "", label: "Overview", icon: "LayoutDashboard", minRole: "member", group: "Personal" },
  { to: "academics", label: "Academic Records", icon: "GraduationCap", minRole: "member", group: "Personal" },
  { to: "transcripts", label: "Transcripts", icon: "FileText", minRole: "member", group: "Personal" },
  { to: "activities", label: "Extracurriculars", icon: "Trophy", minRole: "member", group: "Personal" },
  { to: "resources", label: "Study Resources", icon: "BookOpen", minRole: "member", group: "Personal" },
  { to: "goals", label: "Personal Goals", icon: "Target", minRole: "member", group: "Personal" },
  { to: "calendar", label: "Calendar", icon: "CalendarDays", minRole: "member", group: "Personal" },

  { to: "submit", label: "Submit Content", icon: "Send", minRole: "associate", group: "Contribute" },
  { to: "tasks", label: "Tasks & Events", icon: "ListChecks", minRole: "associate", group: "Contribute" },
  { to: "hours", label: "Volunteer Hours", icon: "Clock", minRole: "associate", group: "Contribute" },

  { to: "workstation", label: "Category Workstation", icon: "ClipboardCheck", minRole: "officer", group: "Review" },

  { to: "users", label: "User Management", icon: "Users", minRole: "admin", group: "Governance" },
  { to: "approvals", label: "Approval & Hours Desk", icon: "BadgeCheck", minRole: "admin", group: "Governance" },
  { to: "assign", label: "Task Assignment", icon: "Megaphone", minRole: "admin", group: "Governance" },
  { to: "activity", label: "Activity & Audit Log", icon: "Activity", minRole: "admin", group: "Governance" },
  { to: "settings", label: "System Settings", icon: "Settings", minRole: "admin", group: "Governance" },
];

export const TAB_GROUPS: TabDef["group"][] = ["Personal", "Contribute", "Review", "Governance"];

export function tabsForRole(role: Role): TabDef[] {
  return TABS.filter((tab) => roleAtLeast(role, tab.minRole));
}
