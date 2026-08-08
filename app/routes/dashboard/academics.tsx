/*
  Academic Records — manual course entry with live GPA.

  GPA is computed on a plain unweighted 4.0 scale using the same letter table
  the public GPA tool uses (`UNWEIGHTED_4_0`), so a student's number here and
  on /gpa-tool agree. Weighted district scales stay in the public tool, which
  is built for them.
*/

import { useMemo, useState } from "react";
import { GraduationCap, Layers, Plus, Trash2, BookMarked } from "lucide-react";
import {
  Button,
  DataBoundary,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  StatTile,
  Td,
  Th,
  TextInput,
  ErrorNote,
} from "~/components/dashboard/ui";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import {
  addAcademicRecord,
  deleteAcademicRecord,
  listAcademicRecords,
  type AcademicRecordRow,
} from "~/lib/db";
import { GRADE_LETTERS, UNWEIGHTED_4_0, type GradeLetter } from "~/data/gpaSystems";

const SEMESTER_SUGGESTIONS = [
  "Fall 2025",
  "Spring 2026",
  "Fall 2026",
  "Spring 2027",
  "Summer 2026",
];

function gpaOf(records: AcademicRecordRow[]) {
  let points = 0;
  let credits = 0;
  for (const record of records) {
    const value = UNWEIGHTED_4_0[record.grade as GradeLetter];
    if (value === undefined) continue;
    points += value * Number(record.credits);
    credits += Number(record.credits);
  }
  return { gpa: credits > 0 ? points / credits : 0, credits };
}

export default function AcademicsTab() {
  const { user } = useDashboard();
  const records = useQuery(() => listAcademicRecords(user.id), [user.id]);
  const rows = records.data ?? [];

  const overall = useMemo(() => gpaOf(rows), [rows]);

  const bySemester = useMemo(() => {
    const groups = new Map<string, AcademicRecordRow[]>();
    for (const row of rows) {
      const list = groups.get(row.semester) ?? [];
      list.push(row);
      groups.set(row.semester, list);
    }
    return [...groups.entries()];
  }, [rows]);

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Academic records"
        description="Enter each course once. GPA, credit totals, and your semester breakdown update as you type."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatTile
          label="Unweighted GPA"
          value={overall.credits > 0 ? overall.gpa.toFixed(2) : "—"}
          hint="4.0 scale, across every course below"
          icon={GraduationCap}
        />
        <StatTile
          label="Total credits"
          value={overall.credits.toFixed(1)}
          hint={`${rows.length} course${rows.length === 1 ? "" : "s"} recorded`}
          icon={Layers}
          tone="marker"
        />
        <StatTile
          label="Semesters"
          value={bySemester.length}
          hint="Grouped by the label you enter"
          icon={BookMarked}
          tone="good"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] items-start">
        <Panel
          title="Courses"
          description="Every course you've entered, newest semester grouping first."
        >
          <DataBoundary loading={records.loading} error={records.error}>
            {rows.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No courses yet."
                description="Add your first course with the form beside this panel — or upload a transcript and type them in from there."
              />
            ) : (
              <div className="space-y-8">
                {bySemester.map(([semester, semesterRows]) => {
                  const totals = gpaOf(semesterRows);
                  return (
                    <div key={semester}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-ink text-sm">{semester}</h3>
                        <p className="course-code text-[0.65rem] uppercase text-ink-soft">
                          {totals.gpa.toFixed(2)} GPA · {totals.credits.toFixed(1)} credits
                        </p>
                      </div>
                      <div className="border border-rule rounded-lg overflow-x-auto">
                        <table className="w-full min-w-[30rem] text-sm border-collapse">
                          <thead>
                            <tr>
                              <Th className="px-4">Course</Th>
                              <Th className="px-4">Grade</Th>
                              <Th className="px-4">Credits</Th>
                              <Th className="px-4" />
                            </tr>
                          </thead>
                          <tbody>
                            {semesterRows.map((row) => (
                              <CourseRow key={row.id} row={row} onChanged={records.reload} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DataBoundary>
        </Panel>

        <AddCourseForm userId={user.id} onAdded={records.reload} />
      </div>
    </>
  );
}

function CourseRow({ row, onChanged }: { row: AcademicRecordRow; onChanged: () => void }) {
  const { busy, run } = useMutation();

  return (
    <tr className="last:[&>td]:border-b-0">
      <Td className="px-4 text-ink font-medium">{row.course_name}</Td>
      <Td className="px-4">
        <span className="course-code text-ink">{row.grade}</span>
      </Td>
      <Td className="px-4 text-ink-soft tabular-nums">{Number(row.credits).toFixed(1)}</Td>
      <Td className="px-4 text-right">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await run(() => deleteAcademicRecord(row.id))) onChanged();
          }}
          aria-label={`Remove ${row.course_name}`}
          className="p-1.5 text-ink-soft hover:text-flag transition-colors rounded disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </Td>
    </tr>
  );
}

function AddCourseForm({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const [courseName, setCourseName] = useState("");
  const [grade, setGrade] = useState<GradeLetter>("A");
  const [credits, setCredits] = useState("1");
  const [semester, setSemester] = useState(SEMESTER_SUGGESTIONS[0]);
  const { busy, error, setError, run } = useMutation();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (courseName.trim().length < 2) {
      setError("Give the course a name.");
      return;
    }
    const creditValue = Number(credits);
    if (!Number.isFinite(creditValue) || creditValue <= 0) {
      setError("Credits must be a number above zero.");
      return;
    }
    const ok = await run(() =>
      addAcademicRecord({
        user_id: userId,
        course_name: courseName.trim(),
        grade,
        credits: creditValue,
        semester: semester.trim() || "Unsorted",
      }),
    );
    if (!ok) return;
    setCourseName("");
    setGrade("A");
    setCredits("1");
    onAdded();
  }

  return (
    <Panel title="Add a course" className="lg:sticky lg:top-24">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote message={error} />}
        <Field label="Course name" htmlFor="course-name">
          <TextInput
            id="course-name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="AP Computer Science A"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grade" htmlFor="course-grade">
            <SelectInput
              id="course-grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value as GradeLetter)}
            >
              {GRADE_LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Credits" htmlFor="course-credits">
            <TextInput
              id="course-credits"
              type="number"
              min="0.5"
              step="0.5"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Semester" htmlFor="course-semester" hint="Anything consistent works.">
          <TextInput
            id="course-semester"
            list="semester-options"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="Fall 2025"
          />
          <datalist id="semester-options">
            {SEMESTER_SUGGESTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Field>
        <Button type="submit" icon={Plus} busy={busy} className="w-full">
          Add course
        </Button>
      </form>
    </Panel>
  );
}
