import { useEffect, useMemo, useState } from "react";
import type { Route } from "./+types/gpa-tool";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { LockBadge, useAuth } from "../auth";
import {
  ALL_GPA_SYSTEMS,
  DEFAULT_SYSTEM,
  GRADE_LETTERS,
  UNWEIGHTED_4_0,
  getGpaSystem,
  type GpaSystem,
} from "../data/gpaSystems";
import {
  allCourses,
  coursePoints,
  cumulativeTotals,
  initialSemester,
  isLegacyTranscript,
  migrateLegacyTranscript,
  newCourse,
  newSemester,
  semesterTotals,
  type CourseInput,
  type SavedTranscript,
  type Semester,
} from "../components/gpa/calc";
import { CustomSystemBuilder, emptyCustomSystem } from "../components/gpa/CustomSystemBuilder";
import { SystemPicker } from "../components/gpa/SystemPicker";
import { ScholarshipFlags } from "../components/gpa/ScholarshipFlags";
import { downloadTranscriptPdf } from "../components/gpa/pdf";
import {
  Download,
  FileText,
  Layers,
  Lock,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "GPA & grade target tools — Illuminate" },
    {
      name: "description",
      content:
        "Calculate your weighted and unweighted GPA against real Texas ISD grading scales, then work out the grades you need to hit your target.",
    },
  ];
}

const FREE_COURSE_LIMIT = 3;

export default function GpaTool() {
  const { isAuthenticated, isReady, openAuth, user } = useAuth();

  const [systemId, setSystemId] = useState(DEFAULT_SYSTEM.id);
  const [customSystem, setCustomSystem] = useState<GpaSystem>(() => emptyCustomSystem());
  const activeSystem: GpaSystem =
    systemId === "custom" ? customSystem : getGpaSystem(systemId) ?? DEFAULT_SYSTEM;

  const [semesters, setSemesters] = useState<Semester[]>(() => [initialSemester(DEFAULT_SYSTEM)]);
  const [priorGpa, setPriorGpa] = useState<number | null>(null);
  const [priorCredits, setPriorCredits] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const totalCourses = allCourses(semesters).length;
  const atCourseLimit = !isAuthenticated && totalCourses >= FREE_COURSE_LIMIT;
  const atSemesterLimit = !isAuthenticated && semesters.length >= 1;

  // Free tier is locked to the generic default scale and no cumulative carry-forward.
  useEffect(() => {
    if (!isAuthenticated) {
      setSystemId(DEFAULT_SYSTEM.id);
      setPriorGpa(null);
      setPriorCredits(null);
    }
  }, [isAuthenticated]);

  // If a course references a level that no longer exists on the active
  // system (switched districts, or a custom level got deleted), snap it
  // back to that system's first level instead of leaving it dangling.
  const typeIdsKey = activeSystem.courseTypes.map((t) => t.id).join(",");
  useEffect(() => {
    setSemesters((prev) =>
      prev.map((sem) => ({
        ...sem,
        courses: sem.courses.map((c) =>
          activeSystem.courseTypes.some((t) => t.id === c.courseTypeId)
            ? c
            : { ...c, courseTypeId: activeSystem.courseTypes[0]?.id ?? c.courseTypeId },
        ),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeIdsKey]);

  // Restore a saved transcript (or migrate a pre-semester v1 save) once the session is known.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    try {
      const v2raw = window.localStorage.getItem(`illuminate.transcript.v2.${user.id}`);
      if (v2raw) {
        const parsed = JSON.parse(v2raw) as SavedTranscript;
        if (parsed.semesters?.length) {
          setSystemId(parsed.systemId ?? DEFAULT_SYSTEM.id);
          if (parsed.customSystem) setCustomSystem(parsed.customSystem);
          setSemesters(parsed.semesters);
          setPriorGpa(parsed.priorGpa ?? null);
          setPriorCredits(parsed.priorCredits ?? null);
          setSavedAt(parsed.savedAt ?? null);
          return;
        }
      }
      const v1raw = window.localStorage.getItem(`illuminate.transcript.${user.id}`);
      if (v1raw) {
        const legacy = JSON.parse(v1raw);
        if (isLegacyTranscript(legacy)) {
          const migrated = migrateLegacyTranscript(legacy);
          setSystemId(migrated.systemId);
          setSemesters(migrated.semesters);
          setSavedAt(migrated.savedAt);
        }
      }
    } catch {
      /* corrupt entry — start fresh */
    }
  }, [isAuthenticated, user]);

  const cumulative = useMemo(
    () => cumulativeTotals(activeSystem, semesters, priorGpa, priorCredits),
    [activeSystem, semesters, priorGpa, priorCredits],
  );

  function updateCourse(semId: string, courseId: string, patch: Partial<CourseInput>) {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id !== semId
          ? s
          : { ...s, courses: s.courses.map((c) => (c.id === courseId ? { ...c, ...patch } : c)) },
      ),
    );
  }

  function addCourse(semId: string) {
    if (atCourseLimit) return openAuth("signup");
    setSemesters((prev) =>
      prev.map((s) => (s.id === semId ? { ...s, courses: [...s.courses, newCourse(activeSystem)] } : s)),
    );
  }

  function removeCourse(semId: string, courseId: string) {
    setSemesters((prev) =>
      prev.map((s) => {
        if (s.id !== semId || s.courses.length === 1) return s;
        return { ...s, courses: s.courses.filter((c) => c.id !== courseId) };
      }),
    );
  }

  function addSemester() {
    if (!isAuthenticated) return openAuth("signup");
    setSemesters((prev) => [...prev, newSemester(activeSystem, `Semester ${prev.length + 1}`)]);
  }

  function removeSemester(semId: string) {
    setSemesters((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== semId) : prev));
  }

  function renameSemester(semId: string, label: string) {
    setSemesters((prev) => prev.map((s) => (s.id === semId ? { ...s, label } : s)));
  }

  function saveTranscript() {
    if (!isAuthenticated || !user) return openAuth("signup");
    const stamp = new Date().toISOString();
    const payload: SavedTranscript = {
      version: 2,
      systemId,
      customSystem: systemId === "custom" ? customSystem : null,
      semesters,
      priorGpa,
      priorCredits,
      savedAt: stamp,
    };
    window.localStorage.setItem(`illuminate.transcript.v2.${user.id}`, JSON.stringify(payload));
    setSavedAt(stamp);
  }

  function exportCsv() {
    if (!isAuthenticated) return openAuth("signup");
    const rows: (string | number)[][] = [
      ["Illuminate GPA transcript"],
      ["Student", user?.name ?? ""],
      ["District / scale", activeSystem.label],
      ["Generated", new Date().toLocaleString()],
      [],
    ];
    for (const sem of semesters) {
      rows.push([sem.label]);
      rows.push([
        "Course",
        "Level",
        activeSystem.scaleType === "raw100" ? "Raw score" : "Grade",
        "Credits",
        "Points",
      ]);
      for (const c of sem.courses) {
        const type = activeSystem.courseTypes.find((t) => t.id === c.courseTypeId);
        rows.push([
          c.name || "Untitled course",
          type?.label ?? "",
          activeSystem.scaleType === "raw100" ? c.rawScore : c.grade,
          c.credits,
          coursePoints(activeSystem, c).toFixed(2),
        ]);
      }
      const totals = semesterTotals(activeSystem, sem.courses);
      rows.push(["", "", "", "Semester GPA", totals.weighted.toFixed(3)]);
      rows.push([]);
    }
    rows.push(["Cumulative weighted GPA", cumulative.weighted.toFixed(3)]);
    rows.push(["Cumulative unweighted GPA (4.0)", cumulative.unweighted.toFixed(3)]);
    rows.push(["Total credits", cumulative.totalCredits]);

    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "illuminate-transcript.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    if (!isAuthenticated || !user) return openAuth("signup");
    downloadTranscriptPdf({
      studentName: user.name,
      studentEmail: user.email,
      system: activeSystem,
      semesters,
      priorGpa,
      priorCredits,
      cumulativeWeighted: cumulative.weighted,
      cumulativeUnweighted: cumulative.unweighted,
      totalCredits: cumulative.totalCredits,
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-chalkboard">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-32 sm:pb-24">
            <p className="reveal font-mono text-xs sm:text-sm uppercase tracking-[0.15em] text-marker mb-8">
              Planning tools
            </p>
            <h1 className="reveal reveal-1 font-display font-black text-[2.75rem] leading-[0.98] sm:text-[4rem] text-chalk tracking-tight max-w-2xl">
              Know your number before report cards do.
            </h1>
            <p className="reveal reveal-2 text-chalk-soft text-lg sm:text-xl leading-relaxed mt-10 max-w-xl">
              Match your real district's weighting, add every semester, and see your GPA
              recalculate the instant you change a grade.
            </p>
          </div>
        </section>

        <section className="bg-paper py-20 sm:py-28">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[1fr_360px] gap-12 items-start">
              {/* ── left: scale + semesters ── */}
              <div className="space-y-10">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="font-display font-extrabold text-2xl text-ink tracking-tight">
                      Grading scale
                    </h2>
                    {!isAuthenticated && <LockBadge label="Texas ISDs locked" />}
                  </div>

                  {isAuthenticated ? (
                    <>
                      <SystemPicker systemId={systemId} onSelect={setSystemId} />
                      <p className="text-ink-soft text-xs leading-relaxed mt-2.5 max-w-xl">
                        {activeSystem.note}
                      </p>
                      {systemId === "custom" && (
                        <div className="mt-5 border border-rule rounded-lg p-5 bg-paper-dim">
                          <CustomSystemBuilder system={customSystem} onChange={setCustomSystem} />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border border-rule rounded-lg p-4 bg-paper-dim flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pen/10 text-pen shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <div className="flex-1">
                        <p className="text-ink font-semibold text-sm">
                          {DEFAULT_SYSTEM.label}
                        </p>
                        <p className="text-ink-soft text-xs mt-0.5">
                          Create a free account to match one of {ALL_GPA_SYSTEMS.length - 1} Texas
                          ISD scales, or build your own.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAuth("signup")}
                        disabled={!isReady}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-pen-solid hover:bg-pen-solid-dim disabled:opacity-60 text-white font-semibold text-xs rounded-md transition-colors"
                      >
                        Unlock
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {semesters.map((semester) => (
                    <SemesterBlock
                      key={semester.id}
                      semester={semester}
                      system={activeSystem}
                      isAuthenticated={isAuthenticated}
                      canRemove={semesters.length > 1}
                      atCourseLimit={atCourseLimit}
                      onRename={(label) => renameSemester(semester.id, label)}
                      onRemove={() => removeSemester(semester.id)}
                      onAddCourse={() => addCourse(semester.id)}
                      onRemoveCourse={(courseId) => removeCourse(semester.id, courseId)}
                      onUpdateCourse={(courseId, patch) => updateCourse(semester.id, courseId, patch)}
                      onLockedTypeSelect={() => openAuth("signup")}
                    />
                  ))}

                  {atSemesterLimit ? (
                    <div className="border border-pen/30 bg-pen/[0.06] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-pen/10 text-pen shrink-0">
                        <Lock className="w-4 h-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-ink font-semibold text-sm">One semester on the free plan.</p>
                        <p className="text-ink-soft text-sm leading-relaxed mt-0.5">
                          A free account adds unlimited semesters and a running cumulative GPA.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAuth("signup")}
                        disabled={!isReady}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-pen-solid hover:bg-pen-solid-dim disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
                      >
                        <Sparkles className="w-4 h-4" /> Unlock free
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={addSemester}
                      className="inline-flex items-center gap-2 px-4 py-2.5 border border-rule hover:border-pen text-ink font-semibold text-sm rounded-lg transition-colors"
                    >
                      <Layers className="w-4 h-4" /> Add a semester
                    </button>
                  )}
                </div>

                {/* ── cumulative carry-forward ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="font-display font-extrabold text-2xl text-ink tracking-tight">
                      Cumulative GPA
                    </h2>
                    {!isAuthenticated && <LockBadge label="Locked" />}
                  </div>
                  <p className="text-ink-soft text-sm leading-relaxed mb-4 max-w-xl">
                    Already have a GPA and credit total from before this tool? Enter them here
                    and every semester above folds into your running total.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 max-w-md">
                    <div>
                      <label
                        htmlFor="prior-gpa"
                        className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
                      >
                        Current weighted GPA
                      </label>
                      <input
                        id="prior-gpa"
                        type="number"
                        step={0.01}
                        min={0}
                        disabled={!isAuthenticated}
                        value={priorGpa ?? ""}
                        onChange={(e) =>
                          setPriorGpa(e.target.value === "" ? null : Number(e.target.value))
                        }
                        placeholder="e.g. 4.2"
                        className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-ink text-sm placeholder:text-ink-soft/50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="prior-credits"
                        className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
                      >
                        Total credits earned
                      </label>
                      <input
                        id="prior-credits"
                        type="number"
                        step={0.5}
                        min={0}
                        disabled={!isAuthenticated}
                        value={priorCredits ?? ""}
                        onChange={(e) =>
                          setPriorCredits(e.target.value === "" ? null : Number(e.target.value))
                        }
                        placeholder="e.g. 12"
                        className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-ink text-sm placeholder:text-ink-soft/50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── right: results ── */}
              <aside className="lg:sticky lg:top-28 self-start space-y-4">
                <div className="border border-rule rounded-lg p-6 bg-paper-dim">
                  <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-3">
                    Cumulative weighted GPA · {activeSystem.maxScale} scale
                  </p>
                  <p className="font-display font-black text-6xl text-ink tracking-tight leading-none">
                    {cumulative.weighted.toFixed(2)}
                  </p>
                  <p className="text-ink-soft text-sm mt-3 leading-relaxed">
                    Unweighted equivalent:{" "}
                    <span className="text-ink font-semibold">
                      {cumulative.unweighted.toFixed(2)}
                    </span>{" "}
                    · {cumulative.totalCredits} total credits.
                  </p>

                  <div className="mt-6 pt-5 border-t border-rule space-y-2.5">
                    <button
                      type="button"
                      onClick={saveTranscript}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-pen-solid hover:bg-pen-solid-dim text-white font-semibold text-sm rounded-lg transition-colors"
                    >
                      {isAuthenticated ? <Save className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      Save transcript
                    </button>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={exportPdf}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-rule hover:border-pen text-ink font-semibold text-sm rounded-lg transition-colors"
                      >
                        {isAuthenticated ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={exportCsv}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-rule hover:border-pen text-ink font-semibold text-sm rounded-lg transition-colors"
                      >
                        {isAuthenticated ? (
                          <Download className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                        CSV
                      </button>
                    </div>
                    {savedAt && (
                      <p className="course-code text-[0.65rem] uppercase text-ink-soft text-center pt-1">
                        Saved {new Date(savedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <ScholarshipFlags unweightedGpa={cumulative.unweighted} />

                <TargetPlanner current={cumulative.unweighted} credits={cumulative.totalCredits} />
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────── semester block ───────────────────────── */

function SemesterBlock({
  semester,
  system,
  isAuthenticated,
  canRemove,
  atCourseLimit,
  onRename,
  onRemove,
  onAddCourse,
  onRemoveCourse,
  onUpdateCourse,
  onLockedTypeSelect,
}: {
  semester: Semester;
  system: GpaSystem;
  isAuthenticated: boolean;
  canRemove: boolean;
  atCourseLimit: boolean;
  onRename: (label: string) => void;
  onRemove: () => void;
  onAddCourse: () => void;
  onRemoveCourse: (courseId: string) => void;
  onUpdateCourse: (courseId: string, patch: Partial<CourseInput>) => void;
  onLockedTypeSelect: () => void;
}) {
  const totals = semesterTotals(system, semester.courses);

  return (
    <div className="border border-rule rounded-lg p-5 sm:p-6 bg-paper">
      <div className="flex items-center justify-between gap-4 mb-5">
        <input
          value={semester.label}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Semester name"
          className="font-display font-bold text-xl text-ink bg-transparent outline-none border-b border-transparent focus:border-pen min-w-0 flex-1"
        />
        <div className="flex items-center gap-3 shrink-0">
          <span className="course-code text-xs text-ink-soft whitespace-nowrap">
            {totals.weighted.toFixed(2)} GPA
          </span>
          {canRemove && isAuthenticated && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${semester.label}`}
              className="p-1.5 text-ink-soft hover:text-ink transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {semester.courses.map((course, i) => (
          <CourseRow
            key={course.id}
            index={i}
            course={course}
            system={system}
            isAuthenticated={isAuthenticated}
            canRemove={semester.courses.length > 1}
            onRemove={() => onRemoveCourse(course.id)}
            onUpdate={(patch) => onUpdateCourse(course.id, patch)}
            onLockedTypeSelect={onLockedTypeSelect}
          />
        ))}
      </div>

      {atCourseLimit ? (
        <div className="mt-4 border border-pen/30 bg-pen/[0.06] rounded-lg p-4 flex items-center gap-3">
          <Lock className="w-4 h-4 text-pen shrink-0" />
          <p className="text-ink-soft text-sm flex-1">
            Three courses is the free limit across your whole transcript.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAddCourse}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-rule hover:border-pen text-ink font-semibold text-sm rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add a course
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── course row (card on mobile, row on desktop) ───────────────────────── */

function CourseRow({
  index,
  course,
  system,
  isAuthenticated,
  canRemove,
  onRemove,
  onUpdate,
  onLockedTypeSelect,
}: {
  index: number;
  course: CourseInput;
  system: GpaSystem;
  isAuthenticated: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (patch: Partial<CourseInput>) => void;
  onLockedTypeSelect: () => void;
}) {
  const inputClass =
    "w-full px-3 py-2 bg-paper border border-rule rounded-md text-ink text-sm placeholder:text-ink-soft/60 focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="border border-rule rounded-lg p-4 bg-paper-dim grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 sm:items-end">
      <div className="col-span-2 sm:col-span-1">
        <label
          htmlFor={`name-${course.id}`}
          className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
        >
          Course {String(index + 1).padStart(2, "0")}
        </label>
        <input
          id={`name-${course.id}`}
          value={course.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="e.g. AP World History"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor={`type-${course.id}`}
          className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
        >
          Level {!isAuthenticated && <LockBadge label="Locked" />}
        </label>
        <select
          id={`type-${course.id}`}
          value={course.courseTypeId}
          disabled={!isAuthenticated}
          onClick={() => !isAuthenticated && onLockedTypeSelect()}
          onChange={(e) => onUpdate({ courseTypeId: e.target.value })}
          className={`${inputClass} sm:w-44`}
        >
          {system.courseTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {system.scaleType === "raw100" ? (
        <div>
          <label
            htmlFor={`raw-${course.id}`}
            className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
          >
            Grade (0–100)
          </label>
          <input
            id={`raw-${course.id}`}
            type="number"
            min={0}
            max={110}
            value={course.rawScore}
            onChange={(e) => onUpdate({ rawScore: Number(e.target.value) || 0 })}
            className={`${inputClass} sm:w-24`}
          />
        </div>
      ) : (
        <div>
          <label
            htmlFor={`grade-${course.id}`}
            className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
          >
            Grade
          </label>
          <select
            id={`grade-${course.id}`}
            value={course.grade}
            onChange={(e) => onUpdate({ grade: e.target.value as CourseInput["grade"] })}
            className={`${inputClass} sm:w-20`}
          >
            {GRADE_LETTERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor={`credits-${course.id}`}
          className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
        >
          Credits
        </label>
        <input
          id={`credits-${course.id}`}
          type="number"
          min={0.5}
          max={4}
          step={0.5}
          value={course.credits}
          onChange={(e) => onUpdate({ credits: Math.max(0.5, Number(e.target.value) || 0.5) })}
          className={`${inputClass} sm:w-20`}
        />
      </div>

      <div className="flex items-end justify-end">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove course ${index + 1}`}
          className="p-2 mb-0.5 text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────── grade target planner ───────────────────── */

function TargetPlanner({ current, credits }: { current: number; credits: number }) {
  const [target, setTarget] = useState(3.8);
  const [upcoming, setUpcoming] = useState(6);

  const needed =
    upcoming > 0 ? (target * (credits + upcoming) - current * credits) / upcoming : 0;
  const reachable = needed <= 4 && needed >= 0;

  return (
    <div className="border border-rule rounded-lg p-6 bg-paper">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-pen" />
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          Grade target planner
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="target-gpa"
            className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
          >
            Target unweighted GPA (4.0 scale)
          </label>
          <input
            id="target-gpa"
            type="number"
            min={0}
            max={4}
            step={0.05}
            value={target}
            onChange={(e) => setTarget(Math.min(4, Math.max(0, Number(e.target.value) || 0)))}
            className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-ink text-sm focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20"
          />
        </div>
        <div>
          <label
            htmlFor="upcoming-credits"
            className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
          >
            Credits still ahead of you
          </label>
          <input
            id="upcoming-credits"
            type="number"
            min={1}
            max={40}
            step={1}
            value={upcoming}
            onChange={(e) => setUpcoming(Math.max(1, Number(e.target.value) || 1))}
            className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-ink text-sm focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20"
          />
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-rule">
        {reachable ? (
          <p className="text-ink text-sm leading-relaxed">
            Average{" "}
            <span className="font-display font-extrabold text-2xl text-pen align-middle">
              {needed.toFixed(2)}
            </span>{" "}
            <span className="text-ink-soft">
              ({letterFor(needed)}) across those {upcoming} credits and you land on{" "}
              {target.toFixed(2)}.
            </span>
          </p>
        ) : (
          <p className="text-ink-soft text-sm leading-relaxed">
            {needed < 0
              ? `You're already past ${target.toFixed(2)} — you'd stay above it even with a rough semester.`
              : `A ${target.toFixed(2)} isn't reachable in ${upcoming} credits from a ${current.toFixed(2)}. Add more credits or aim a little lower.`}
          </p>
        )}
      </div>
    </div>
  );
}

function letterFor(points: number) {
  const entries = Object.entries(UNWEIGHTED_4_0).sort((a, b) => a[1] - b[1]);
  for (const [letter, value] of entries) {
    if (points <= value) return letter;
  }
  return "A";
}
