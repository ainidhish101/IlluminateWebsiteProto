import {
  DEFAULT_SYSTEM,
  UNWEIGHTED_4_0,
  raw100ToUnweighted4,
  type GpaSystem,
  type GradeLetter,
} from "../../data/gpaSystems";

export type CourseInput = {
  id: string;
  name: string;
  credits: number;
  courseTypeId: string;
  /** Used when the active system's scaleType is "letter". */
  grade: GradeLetter;
  /** Used when the active system's scaleType is "raw100". */
  rawScore: number;
};

export type Semester = {
  id: string;
  label: string;
  courses: CourseInput[];
};

// Only ever called from client-triggered handlers (button clicks), never
// from a useState initializer — Date.now()-based ids evaluated during SSR
// vs. hydration would otherwise disagree and break hydration.
let uid = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${uid++}`;

export function newCourse(system: GpaSystem): CourseInput {
  return {
    id: nextId("course"),
    name: "",
    credits: 1,
    courseTypeId: system.courseTypes[0]?.id ?? "regular",
    grade: "A",
    rawScore: 90,
  };
}

export function newSemester(system: GpaSystem, label: string): Semester {
  return { id: nextId("sem"), label, courses: [newCourse(system)] };
}

/**
 * Deterministic first-load state — safe to use inside a useState
 * initializer, unlike newSemester(), since SSR and the client hydration
 * pass must produce identical ids.
 */
export function initialSemester(system: GpaSystem): Semester {
  return {
    id: "sem-initial",
    label: "Semester 1",
    courses: [
      {
        id: "course-initial",
        name: "",
        credits: 1,
        courseTypeId: system.courseTypes[0]?.id ?? "regular",
        grade: "A",
        rawScore: 90,
      },
    ],
  };
}

function courseType(system: GpaSystem, course: CourseInput) {
  return (
    system.courseTypes.find((t) => t.id === course.courseTypeId) ?? system.courseTypes[0]
  );
}

/** A course's points on the district's own (possibly non-4.0) scale. */
export function coursePoints(system: GpaSystem, course: CourseInput): number {
  const type = courseType(system, course);
  if (!type) return 0;
  if (system.scaleType === "raw100") {
    return (course.rawScore || 0) + (type.bonus ?? 0);
  }
  return type.points?.[course.grade] ?? 0;
}

/** A course's value on a plain 4.0 scale, for cross-district comparison. */
export function courseUnweighted4(system: GpaSystem, course: CourseInput): number {
  if (system.scaleType === "raw100") {
    return raw100ToUnweighted4(course.rawScore || 0);
  }
  return UNWEIGHTED_4_0[course.grade] ?? 0;
}

export function semesterTotals(system: GpaSystem, courses: CourseInput[]) {
  let weightedPoints = 0;
  let unweightedPoints = 0;
  let credits = 0;
  for (const c of courses) {
    weightedPoints += coursePoints(system, c) * c.credits;
    unweightedPoints += courseUnweighted4(system, c) * c.credits;
    credits += c.credits;
  }
  return {
    credits,
    weighted: credits > 0 ? weightedPoints / credits : 0,
    unweighted: credits > 0 ? unweightedPoints / credits : 0,
    weightedPoints,
    unweightedPoints,
  };
}

export function allCourses(semesters: Semester[]): CourseInput[] {
  return semesters.flatMap((s) => s.courses);
}

export function cumulativeTotals(
  system: GpaSystem,
  semesters: Semester[],
  priorGpa: number | null,
  priorCredits: number | null,
) {
  const courses = allCourses(semesters);
  const totals = semesterTotals(system, courses);
  const pCredits = priorCredits ?? 0;
  const pGpa = priorGpa ?? 0;
  const totalCredits = totals.credits + pCredits;
  const weighted =
    totalCredits > 0 ? (totals.weightedPoints + pGpa * pCredits) / totalCredits : 0;
  return {
    totalCredits,
    weighted,
    unweighted: totals.unweighted, // no separate prior-unweighted input, so this covers entered coursework only
    newCredits: totals.credits,
  };
}

/* ───────────────────────── persistence shape ───────────────────────── */

export type SavedTranscript = {
  version: 2;
  systemId: string;
  customSystem: GpaSystem | null;
  semesters: Semester[];
  priorGpa: number | null;
  priorCredits: number | null;
  savedAt: string;
};

type LegacyCourse = {
  id: string;
  name: string;
  grade: string;
  credits: number;
  type: "regular" | "honors" | "ap";
};

type LegacyTranscript = {
  courses: LegacyCourse[];
  weighted: boolean;
  scaleCap: number;
  savedAt: string;
};

const LEGACY_TYPE_MAP: Record<LegacyCourse["type"], string> = {
  regular: "regular",
  honors: "honors",
  ap: "ap_ib",
};

/** Upgrades a v1 (flat course list) save into the v2 (semesters + system) shape. */
export function migrateLegacyTranscript(legacy: LegacyTranscript): SavedTranscript {
  return {
    version: 2,
    systemId: DEFAULT_SYSTEM.id,
    customSystem: null,
    semesters: [
      {
        id: nextId("sem"),
        label: "Semester 1",
        courses: legacy.courses.map((c) => ({
          id: c.id,
          name: c.name,
          credits: c.credits,
          courseTypeId: LEGACY_TYPE_MAP[c.type] ?? "regular",
          grade: (c.grade as GradeLetter) ?? "A",
          rawScore: 90,
        })),
      },
    ],
    priorGpa: null,
    priorCredits: null,
    savedAt: legacy.savedAt,
  };
}

export function isLegacyTranscript(value: unknown): value is LegacyTranscript {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as LegacyTranscript).courses) &&
    !(value as SavedTranscript).version
  );
}
