/*
  Shared types for the advisor-coach function.

  These mirror the table shapes in `supabase/schema.sql`, narrowed to the
  columns the coach actually reads — the SELECT lists in `index.ts` are kept
  in step with these, so a column that isn't here is never fetched and can't
  leak into a prompt.
*/

export type CoachMode = "chat" | "rate" | "opportunities";

export type ProfileRow = {
  full_name: string | null;
  grade_level: string | null;
  interests: string | null;
  role: string;
};

export type AcademicRecordRow = {
  course_name: string;
  grade: string;
  credits: number;
  semester: string;
};

export type ExtracurricularRow = {
  category: string;
  activity_name: string;
  position: string | null;
  hours: number;
  achievements: string | null;
};

export type GoalRow = {
  title: string;
  horizon: string;
  status: string;
  target_date: string | null;
};

export type VolunteerHourRow = {
  hours: number;
  reason: string;
  date: string;
};

export type TaskRow = {
  status: string;
  due_date: string | null;
};

export type SubmissionRow = {
  status: string;
};

export type CoachContext = {
  profile: ProfileRow | null;
  records: AcademicRecordRow[];
  activities: ExtracurricularRow[];
  goals: GoalRow[];
  hours: VolunteerHourRow[];
  tasks: TaskRow[];
  submissions: SubmissionRow[];
};

/** Request body the React client posts. */
export type CoachRequest = {
  mode: CoachMode;
  message?: string;
  conversationId?: string | null;
  /** Prior turns, oldest first. Trimmed server-side. */
  history?: { role: "user" | "assistant"; content: string }[];
};

export type SubScore = { score: number; rationale: string };

export type RatingPayload = {
  summary: string;
  overall: number;
  subscores: {
    academics: SubScore;
    extracurriculars: SubScore;
    leadership: SubScore;
  };
  quick_wins: { title: string; why: string; effort: string }[];
  missing_data: { section: string; why_it_matters: string; where: string }[];
};

export type CoachResponse = {
  mode: CoachMode;
  text: string;
  rating: RatingPayload | null;
  sources: { title: string; url: string }[];
  conversationId: string | null;
  usage: { input_tokens: number; output_tokens: number } | null;
};
