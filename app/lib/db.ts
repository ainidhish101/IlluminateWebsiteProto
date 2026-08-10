/*
  Every Supabase read and write the dashboard performs.

  Row types mirror the SQL in `supabase/schema.sql` exactly. Nothing in this
  file re-checks permissions: Row Level Security in Postgres is the real
  gate, and the UI simply avoids rendering controls that would be rejected.

  Related rows (author names on a submission, assignee names on a task) are
  joined in JavaScript against a single `listProfiles()` fetch rather than via
  PostgREST embeds. It costs one extra request and removes any dependency on
  foreign-key constraint names.
*/

import { getSupabase, AP_SCORE_REPORT_BUCKET, TRANSCRIPT_BUCKET } from "./supabase";
import type {
  ActivityCategory,
  GoalHorizon,
  GoalStatus,
  GuideCategory,
  Role,
  SubmissionStatus,
  TaskPriority,
  TaskStatus,
} from "./roles";

/* ───────────────────────── row types ───────────────────────── */

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  grade_level: string | null;
  interests: string | null;
  role: Role;
  officer_category: string | null;
  created_at: string;
};

export type AcademicRecordRow = {
  id: string;
  user_id: string;
  course_name: string;
  grade: string;
  credits: number;
  semester: string;
  created_at: string;
};

export type TranscriptRow = {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  note: string | null;
  uploaded_at: string;
};

export type ApScoreRow = {
  id: string;
  user_id: string;
  subject: string;
  score: number;
  exam_year: number;
  score_report_path: string | null;
  score_report_name: string | null;
  created_at: string;
};

export type ExtracurricularRow = {
  id: string;
  user_id: string;
  category: string;
  activity_name: string;
  position: string | null;
  hours: number;
  achievements: string | null;
  created_at: string;
};

export type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  detail: string | null;
  horizon: GoalHorizon;
  status: GoalStatus;
  target_date: string | null;
  created_at: string;
};

export type SubmissionRow = {
  id: string;
  user_id: string;
  title: string;
  doc_url: string;
  category: string;
  status: SubmissionStatus;
  notes: string | null;
  feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type TaskRow = {
  id: string;
  assigned_to: string | null;
  assigned_role: Role | null;
  created_by: string | null;
  title: string;
  detail: string | null;
  priority: TaskPriority;
  due_date: string | null;
  status: TaskStatus;
  category: string | null;
  created_at: string;
};

export type VolunteerHourRow = {
  id: string;
  user_id: string;
  guide_id: string | null;
  hours: number;
  reason: string;
  approved_by: string | null;
  date: string;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

/* ───────────────────────── helpers ───────────────────────── */

/** Unwraps a PostgREST result, turning its error into a throw. */
function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return (data ?? []) as T;
}

export type ProfileIndex = Map<string, ProfileRow>;

export function indexProfiles(profiles: ProfileRow[]): ProfileIndex {
  return new Map(profiles.map((p) => [p.id, p]));
}

export function displayName(profile: ProfileRow | undefined): string {
  if (!profile) return "Unknown user";
  return profile.full_name?.trim() || profile.email;
}

/* ───────────────────────── profiles ───────────────────────── */

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

/** Everyone can read the member directory; RLS keeps writes to admins. */
export async function listProfiles(): Promise<ProfileRow[]> {
  return unwrap<ProfileRow[]>(
    await getSupabase().from("profiles").select("*").order("created_at", { ascending: false }),
  );
}

export async function updateProfileRow(
  userId: string,
  patch: Partial<Omit<ProfileRow, "id" | "email" | "created_at">>,
): Promise<ProfileRow> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProfileRow;
}

/** Admin-only in practice — RLS rejects this for everyone else. */
export async function setUserRole(
  userId: string,
  role: Role,
  officerCategory: string | null,
): Promise<ProfileRow> {
  const updated = await updateProfileRow(userId, {
    role,
    officer_category: role === "officer" ? officerCategory : null,
  });
  await logActivity({
    action: "role_changed",
    entity: "profile",
    entityId: userId,
    detail: `${displayName(updated)} is now ${role.toUpperCase()}${
      updated.officer_category ? ` — ${updated.officer_category}` : ""
    }`,
  });
  return updated;
}

/* ───────────────────────── academic records ───────────────────────── */

export async function listAcademicRecords(userId: string): Promise<AcademicRecordRow[]> {
  return unwrap<AcademicRecordRow[]>(
    await getSupabase()
      .from("academic_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  );
}

export async function addAcademicRecord(input: {
  user_id: string;
  course_name: string;
  grade: string;
  credits: number;
  semester: string;
}): Promise<AcademicRecordRow> {
  const { data, error } = await getSupabase()
    .from("academic_records")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as AcademicRecordRow;
}

export async function updateAcademicRecord(
  id: string,
  patch: Partial<Pick<AcademicRecordRow, "course_name" | "grade" | "credits" | "semester">>,
): Promise<void> {
  const { error } = await getSupabase().from("academic_records").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteAcademicRecord(id: string): Promise<void> {
  const { error } = await getSupabase().from("academic_records").delete().eq("id", id);
  if (error) throw error;
}

/* ───────────────────────── transcripts ───────────────────────── */

export async function listTranscripts(userId: string): Promise<TranscriptRow[]> {
  return unwrap<TranscriptRow[]>(
    await getSupabase()
      .from("transcripts")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false }),
  );
}

/** Files live under `<user id>/<timestamp>-<name>` so storage RLS can check ownership. */
export async function uploadTranscript(
  userId: string,
  file: File,
  note: string,
): Promise<TranscriptRow> {
  const supabase = getSupabase();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(TRANSCRIPT_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("transcripts")
    .insert({ user_id: userId, file_path: path, file_name: file.name, note: note || null })
    .select("*")
    .single();
  if (error) throw error;
  return data as TranscriptRow;
}

/** Signed URL for a private bucket object. Valid for one hour. */
export async function transcriptUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(TRANSCRIPT_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteTranscript(row: TranscriptRow): Promise<void> {
  const supabase = getSupabase();
  await supabase.storage.from(TRANSCRIPT_BUCKET).remove([row.file_path]);
  const { error } = await supabase.from("transcripts").delete().eq("id", row.id);
  if (error) throw error;
}

/* ───────────────────────── AP scores ───────────────────────── */

export async function listApScores(userId: string): Promise<ApScoreRow[]> {
  return unwrap<ApScoreRow[]>(
    await getSupabase()
      .from("ap_scores")
      .select("*")
      .eq("user_id", userId)
      .order("exam_year", { ascending: false })
      .order("created_at", { ascending: false }),
  );
}

/**
 * Adds an AP score, optionally attaching a scanned score report. The report,
 * if present, uploads first — same private-bucket, owner-prefixed path
 * convention as `uploadTranscript`.
 */
export async function addApScore(input: {
  user_id: string;
  subject: string;
  score: number;
  exam_year: number;
  report?: File | null;
}): Promise<ApScoreRow> {
  const supabase = getSupabase();
  let score_report_path: string | null = null;
  let score_report_name: string | null = null;

  if (input.report) {
    const safeName = input.report.name.replace(/[^\w.\-]+/g, "_");
    const path = `${input.user_id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(AP_SCORE_REPORT_BUCKET)
      .upload(path, input.report, { upsert: false, contentType: input.report.type || undefined });
    if (uploadError) throw uploadError;
    score_report_path = path;
    score_report_name = input.report.name;
  }

  const { data, error } = await supabase
    .from("ap_scores")
    .insert({
      user_id: input.user_id,
      subject: input.subject,
      score: input.score,
      exam_year: input.exam_year,
      score_report_path,
      score_report_name,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ApScoreRow;
}

/** Signed URL for a private score report. Valid for one hour. */
export async function apScoreReportUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(AP_SCORE_REPORT_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteApScore(row: ApScoreRow): Promise<void> {
  const supabase = getSupabase();
  if (row.score_report_path) {
    await supabase.storage.from(AP_SCORE_REPORT_BUCKET).remove([row.score_report_path]);
  }
  const { error } = await supabase.from("ap_scores").delete().eq("id", row.id);
  if (error) throw error;
}

/* ───────────────────────── extracurriculars ───────────────────────── */

export async function listExtracurriculars(userId: string): Promise<ExtracurricularRow[]> {
  return unwrap<ExtracurricularRow[]>(
    await getSupabase()
      .from("extracurriculars")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
}

export async function addExtracurricular(input: {
  user_id: string;
  category: ActivityCategory | string;
  activity_name: string;
  position: string | null;
  hours: number;
  achievements: string | null;
}): Promise<ExtracurricularRow> {
  const { data, error } = await getSupabase()
    .from("extracurriculars")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as ExtracurricularRow;
}

export async function deleteExtracurricular(id: string): Promise<void> {
  const { error } = await getSupabase().from("extracurriculars").delete().eq("id", id);
  if (error) throw error;
}

/* ───────────────────────── goals ───────────────────────── */

export async function listGoals(userId: string): Promise<GoalRow[]> {
  return unwrap<GoalRow[]>(
    await getSupabase()
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
}

export async function addGoal(input: {
  user_id: string;
  title: string;
  detail: string | null;
  horizon: GoalHorizon;
  target_date: string | null;
}): Promise<GoalRow> {
  const { data, error } = await getSupabase().from("goals").insert(input).select("*").single();
  if (error) throw error;
  return data as GoalRow;
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<void> {
  const { error } = await getSupabase().from("goals").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await getSupabase().from("goals").delete().eq("id", id);
  if (error) throw error;
}

/* ───────────────────────── guide submissions ───────────────────────── */

export async function listMySubmissions(userId: string): Promise<SubmissionRow[]> {
  return unwrap<SubmissionRow[]>(
    await getSupabase()
      .from("guides_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
}

/**
 * The Officer workstation filter. Passing a category returns only that
 * category's submissions — RLS enforces the same rule server-side, so an
 * Officer cannot widen this by editing the request.
 */
export async function listSubmissionsByCategory(category: string): Promise<SubmissionRow[]> {
  return unwrap<SubmissionRow[]>(
    await getSupabase()
      .from("guides_submissions")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false }),
  );
}

export async function listAllSubmissions(): Promise<SubmissionRow[]> {
  return unwrap<SubmissionRow[]>(
    await getSupabase()
      .from("guides_submissions")
      .select("*")
      .order("created_at", { ascending: false }),
  );
}

export async function createSubmission(input: {
  user_id: string;
  title: string;
  doc_url: string;
  category: GuideCategory | string;
  notes: string | null;
}): Promise<SubmissionRow> {
  const { data, error } = await getSupabase()
    .from("guides_submissions")
    .insert({ ...input, status: "pending_officer" satisfies SubmissionStatus })
    .select("*")
    .single();
  if (error) throw error;
  const row = data as SubmissionRow;
  await logActivity({
    action: "submission_created",
    entity: "guide",
    entityId: row.id,
    detail: `"${row.title}" submitted under ${row.category}`,
  });
  return row;
}

export async function reviewSubmission(
  id: string,
  patch: { status: SubmissionStatus; feedback: string | null; reviewerId: string },
): Promise<SubmissionRow> {
  const { data, error } = await getSupabase()
    .from("guides_submissions")
    .update({
      status: patch.status,
      feedback: patch.feedback,
      reviewed_by: patch.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  const row = data as SubmissionRow;
  await logActivity({
    action: `submission_${row.status}`,
    entity: "guide",
    entityId: row.id,
    detail: `"${row.title}" → ${row.status.replace(/_/g, " ")}`,
  });
  return row;
}

/* ───────────────────────── tasks ───────────────────────── */

/** Tasks aimed at this user directly, plus broadcasts to their whole tier. */
export async function listTasksFor(userId: string, role: Role): Promise<TaskRow[]> {
  return unwrap<TaskRow[]>(
    await getSupabase()
      .from("tasks")
      .select("*")
      .or(`assigned_to.eq.${userId},assigned_role.eq.${role}`)
      .order("due_date", { ascending: true, nullsFirst: false }),
  );
}

export async function listAllTasks(): Promise<TaskRow[]> {
  return unwrap<TaskRow[]>(
    await getSupabase().from("tasks").select("*").order("created_at", { ascending: false }),
  );
}

export async function createTask(input: {
  assigned_to: string | null;
  assigned_role: Role | null;
  created_by: string;
  title: string;
  detail: string | null;
  priority: TaskPriority;
  due_date: string | null;
  category: string | null;
}): Promise<TaskRow> {
  const { data, error } = await getSupabase()
    .from("tasks")
    .insert({ ...input, status: "todo" satisfies TaskStatus })
    .select("*")
    .single();
  if (error) throw error;
  const row = data as TaskRow;
  await logActivity({
    action: "task_assigned",
    entity: "task",
    entityId: row.id,
    detail: `"${row.title}" (${row.priority}) assigned to ${
      row.assigned_role ? `all ${row.assigned_role}s` : "one member"
    }`,
  });
  return row;
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { error } = await getSupabase().from("tasks").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await getSupabase().from("tasks").delete().eq("id", id);
  if (error) throw error;
}

/* ───────────────────────── volunteer hours ───────────────────────── */

export async function listMyHours(userId: string): Promise<VolunteerHourRow[]> {
  return unwrap<VolunteerHourRow[]>(
    await getSupabase()
      .from("volunteer_hours")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
  );
}

export async function listAllHours(): Promise<VolunteerHourRow[]> {
  return unwrap<VolunteerHourRow[]>(
    await getSupabase()
      .from("volunteer_hours")
      .select("*")
      .order("date", { ascending: false }),
  );
}

/** The Director-only hours engine. `guide_id` ties the award to an approved guide. */
export async function grantHours(input: {
  user_id: string;
  guide_id: string | null;
  hours: number;
  reason: string;
  approved_by: string;
}): Promise<VolunteerHourRow> {
  const { data, error } = await getSupabase()
    .from("volunteer_hours")
    .insert({ ...input, date: new Date().toISOString().slice(0, 10) })
    .select("*")
    .single();
  if (error) throw error;
  const row = data as VolunteerHourRow;
  await logActivity({
    action: "hours_granted",
    entity: "volunteer_hours",
    entityId: row.id,
    detail: `${row.hours} hours awarded — ${row.reason}`,
  });
  return row;
}

export function totalHours(rows: VolunteerHourRow[]): number {
  return rows.reduce((sum, r) => sum + Number(r.hours || 0), 0);
}

/* ───────────────────────── activity log ───────────────────────── */

export async function listActivity(limit = 100): Promise<ActivityLogRow[]> {
  return unwrap<ActivityLogRow[]>(
    await getSupabase()
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

/**
 * Fire-and-forget audit write. A failed log entry must never break the action
 * that produced it, so errors are swallowed after a console warning.
 */
export async function logActivity(input: {
  action: string;
  entity: string;
  entityId: string | null;
  detail: string;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    await supabase.from("activity_log").insert({
      actor_id: data.user?.id ?? null,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId,
      detail: input.detail,
    });
  } catch (error) {
    console.warn("activity_log write failed", error);
  }
}
