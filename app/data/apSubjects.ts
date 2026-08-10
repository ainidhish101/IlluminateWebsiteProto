/** The current College Board AP exam catalog, A–Z. */
export const AP_SUBJECTS = [
  "AP African American Studies",
  "AP Art History",
  "AP Biology",
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Chemistry",
  "AP Chinese Language and Culture",
  "AP Comparative Government and Politics",
  "AP Computer Science A",
  "AP Computer Science Principles",
  "AP English Language and Composition",
  "AP English Literature and Composition",
  "AP Environmental Science",
  "AP European History",
  "AP French Language and Culture",
  "AP German Language and Culture",
  "AP Human Geography",
  "AP Italian Language and Culture",
  "AP Japanese Language and Culture",
  "AP Latin",
  "AP Macroeconomics",
  "AP Microeconomics",
  "AP Music Theory",
  "AP Physics 1: Algebra-Based",
  "AP Physics 2: Algebra-Based",
  "AP Physics C: Electricity and Magnetism",
  "AP Physics C: Mechanics",
  "AP Precalculus",
  "AP Psychology",
  "AP Research",
  "AP Seminar",
  "AP Spanish Language and Culture",
  "AP Spanish Literature and Culture",
  "AP Statistics",
  "AP Studio Art: 2-D Design",
  "AP Studio Art: 3-D Design",
  "AP Studio Art: Drawing",
  "AP U.S. Government and Politics",
  "AP U.S. History",
  "AP World History: Modern",
] as const;

export type ApSubject = (typeof AP_SUBJECTS)[number];

export const AP_SCORES = [5, 4, 3, 2, 1] as const;

export type ApScoreValue = (typeof AP_SCORES)[number];

/** College Board's own wording for what each score means. */
export const AP_SCORE_LABEL: Record<ApScoreValue, string> = {
  5: "5 — Extremely well qualified",
  4: "4 — Well qualified",
  3: "3 — Qualified",
  2: "2 — Possibly qualified",
  1: "1 — No recommendation",
};
