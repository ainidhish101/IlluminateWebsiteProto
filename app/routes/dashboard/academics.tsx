/*
  Academic Records — manual course entry with live GPA.

  GPA is computed on a plain unweighted 4.0 scale using the same letter table
  the public GPA tool uses (`UNWEIGHTED_4_0`), so a student's number here and
  on /gpa-tool agree. Weighted district scales stay in the public tool, which
  is built for them.
*/

import { useMemo, useRef, useState } from "react";
import {
  Award,
  BookMarked,
  Download,
  GraduationCap,
  Layers,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import {
  Button,
  Chip,
  DataBoundary,
  EmptyState,
  ErrorNote,
  Field,
  PageHeader,
  Panel,
  SelectInput,
  StatTile,
  TableWrap,
  Td,
  Th,
  TextInput,
  formatDate,
} from "~/components/dashboard/ui";
import { useDashboard } from "~/lib/dashboardContext";
import { useMutation, useQuery } from "~/lib/useQuery";
import {
  addAcademicRecord,
  addApScore,
  addStandardizedTestScore,
  apScoreReportUrl,
  deleteAcademicRecord,
  deleteApScore,
  deleteStandardizedTestScore,
  listAcademicRecords,
  listApScores,
  listStandardizedTestScores,
  type AcademicRecordRow,
  type ApScoreRow,
  type StandardizedTestScoreRow,
} from "~/lib/db";
import { errorMessage } from "~/lib/supabase";
import { GRADE_LETTERS, UNWEIGHTED_4_0, type GradeLetter } from "~/data/gpaSystems";
import { AP_SCORES, AP_SCORE_LABEL, AP_SUBJECTS, type ApScoreValue } from "~/data/apSubjects";
import {
  CUSTOM_TEST_KEY,
  STANDARD_TESTS,
  maxScoreFor,
  type TestTypeKey,
} from "~/data/standardizedTests";

const AP_REPORT_ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp,.heic";
const AP_REPORT_MAX_BYTES = 10 * 1024 * 1024;

const AP_SCORE_TONE: Record<ApScoreValue, "good" | "marker" | "flag"> = {
  5: "good",
  4: "good",
  3: "marker",
  2: "flag",
  1: "flag",
};

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
  const apScores = useQuery(() => listApScores(user.id), [user.id]);
  const apRows = apScores.data ?? [];
  const testScores = useQuery(() => listStandardizedTestScores(user.id), [user.id]);
  const testRows = testScores.data ?? [];

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

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] items-start mb-8">
        <Panel
          title="Standardized testing"
          description="SAT, ACT, PSAT, or any other test — log every sitting, oldest to newest."
        >
          <DataBoundary loading={testScores.loading} error={testScores.error}>
            {testRows.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No test scores yet."
                description="Add your first SAT, ACT, PSAT, or custom test score with the form beside this panel."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Test</Th>
                    <Th>Score</Th>
                    <Th>Date</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {testRows.map((row) => (
                    <TestScoreRowView key={row.id} row={row} onChanged={testScores.reload} />
                  ))}
                </tbody>
              </TableWrap>
            )}
          </DataBoundary>
        </Panel>

        <AddTestScoreForm userId={user.id} onAdded={testScores.reload} />
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

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] items-start mt-8">
        <Panel
          title="AP exam scores"
          description="Self-reported. Add a score as soon as College Board releases it, with an optional copy of your score report."
        >
          <DataBoundary loading={apScores.loading} error={apScores.error}>
            {apRows.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No AP scores yet."
                description="Add your first exam score with the form beside this panel."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Subject</Th>
                    <Th>Score</Th>
                    <Th>Year</Th>
                    <Th>Report</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {apRows.map((row) => (
                    <ApScoreRowView key={row.id} row={row} onChanged={apScores.reload} />
                  ))}
                </tbody>
              </TableWrap>
            )}
          </DataBoundary>
        </Panel>

        <AddApScoreForm userId={user.id} onAdded={apScores.reload} />
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

function ApScoreRowView({ row, onChanged }: { row: ApScoreRow; onChanged: () => void }) {
  const { busy, run } = useMutation();
  const [linkError, setLinkError] = useState("");

  async function openReport() {
    if (!row.score_report_path) return;
    try {
      const url = await apScoreReportUrl(row.score_report_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setLinkError(errorMessage(error, "Couldn't open that file."));
    }
  }

  return (
    <tr>
      <Td className="text-ink font-medium">{row.subject}</Td>
      <Td>
        <Chip tone={AP_SCORE_TONE[row.score as ApScoreValue] ?? "neutral"}>{row.score}</Chip>
      </Td>
      <Td className="text-ink-soft tabular-nums">{row.exam_year}</Td>
      <Td>
        {row.score_report_path ? (
          <button
            type="button"
            onClick={openReport}
            className="inline-flex items-center gap-1.5 text-pen hover:underline text-sm font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            {row.score_report_name || "Download"}
          </button>
        ) : (
          <span className="text-ink-soft">—</span>
        )}
        {linkError && <span className="block text-flag text-xs mt-1">{linkError}</span>}
      </Td>
      <Td className="text-right">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await run(() => deleteApScore(row))) onChanged();
          }}
          aria-label={`Remove ${row.subject}`}
          className="p-1.5 text-ink-soft hover:text-flag transition-colors rounded disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </Td>
    </tr>
  );
}

function AddApScoreForm({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const currentYear = new Date().getFullYear();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState<string>(AP_SUBJECTS[0]);
  const [score, setScore] = useState<ApScoreValue>(5);
  const [examYear, setExamYear] = useState(String(currentYear));
  const [report, setReport] = useState<File | null>(null);
  const { busy, error, setError, run } = useMutation();

  function pickReport(candidate: File | undefined) {
    if (!candidate) return;
    if (candidate.size > AP_REPORT_MAX_BYTES) {
      setError("That file is over 10 MB. Compress it or export a smaller PDF.");
      return;
    }
    setError(null);
    setReport(candidate);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const yearValue = Number(examYear);
    if (!Number.isInteger(yearValue) || yearValue < 2000 || yearValue > currentYear + 1) {
      setError("Enter a valid exam year.");
      return;
    }
    const ok = await run(() =>
      addApScore({
        user_id: userId,
        subject,
        score,
        exam_year: yearValue,
        report,
      }),
    );
    if (!ok) return;
    setSubject(AP_SUBJECTS[0]);
    setScore(5);
    setExamYear(String(currentYear));
    setReport(null);
    if (inputRef.current) inputRef.current.value = "";
    onAdded();
  }

  return (
    <Panel title="Add an AP score" className="lg:sticky lg:top-24">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote message={error} />}
        <Field label="Subject" htmlFor="ap-subject">
          <SelectInput
            id="ap-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {AP_SUBJECTS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Score" htmlFor="ap-score">
            <SelectInput
              id="ap-score"
              value={score}
              onChange={(e) => setScore(Number(e.target.value) as ApScoreValue)}
            >
              {AP_SCORES.map((value) => (
                <option key={value} value={value}>
                  {AP_SCORE_LABEL[value]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Exam year" htmlFor="ap-year">
            <TextInput
              id="ap-year"
              type="number"
              min="2000"
              max={currentYear + 1}
              value={examYear}
              onChange={(e) => setExamYear(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Score report"
          htmlFor="ap-report"
          hint="Optional — PDF or photo, up to 10 MB."
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-2 border border-rule bg-paper hover:border-pen rounded-lg text-sm font-semibold text-ink transition-colors shrink-0"
            >
              {report ? "Change file" : "Choose file"}
            </button>
            <span className="text-ink-soft text-xs truncate">
              {report ? report.name : "No file selected"}
            </span>
          </div>
          <input
            ref={inputRef}
            id="ap-report"
            type="file"
            accept={AP_REPORT_ACCEPTED}
            className="sr-only"
            onChange={(e) => pickReport(e.target.files?.[0])}
          />
        </Field>
        <Button type="submit" icon={Plus} busy={busy} className="w-full">
          Add AP score
        </Button>
      </form>
    </Panel>
  );
}

function testLabel(row: StandardizedTestScoreRow): string {
  return row.test_type === CUSTOM_TEST_KEY
    ? row.custom_test_name || "Custom test"
    : row.test_type;
}

function TestScoreRowView({
  row,
  onChanged,
}: {
  row: StandardizedTestScoreRow;
  onChanged: () => void;
}) {
  const { busy, run } = useMutation();

  return (
    <tr>
      <Td className="text-ink font-medium">{testLabel(row)}</Td>
      <Td className="text-ink-soft tabular-nums">
        {row.score} <span className="text-ink-soft">/ {row.max_score}</span>
      </Td>
      <Td className="text-ink-soft whitespace-nowrap">{formatDate(row.test_date)}</Td>
      <Td className="text-right">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (await run(() => deleteStandardizedTestScore(row.id))) onChanged();
          }}
          aria-label={`Remove ${testLabel(row)}`}
          className="p-1.5 text-ink-soft hover:text-flag transition-colors rounded disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </Td>
    </tr>
  );
}

function AddTestScoreForm({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [testType, setTestType] = useState<TestTypeKey>(STANDARD_TESTS[0].key);
  const [customName, setCustomName] = useState("");
  const [customMaxScore, setCustomMaxScore] = useState("100");
  const [score, setScore] = useState("");
  const [testDate, setTestDate] = useState(today);
  const { busy, error, setError, run } = useMutation();

  const isCustom = testType === CUSTOM_TEST_KEY;
  const maxScore = isCustom ? Number(customMaxScore) : maxScoreFor(testType) ?? 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isCustom && customName.trim().length < 2) {
      setError("Name the test.");
      return;
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      setError("Max score must be a number above zero.");
      return;
    }
    const scoreValue = Number(score);
    if (!Number.isFinite(scoreValue) || scoreValue < 0 || scoreValue > maxScore) {
      setError(`Score must be between 0 and ${maxScore}.`);
      return;
    }
    if (!testDate) {
      setError("Pick the test date.");
      return;
    }
    const ok = await run(() =>
      addStandardizedTestScore({
        user_id: userId,
        test_type: testType,
        custom_test_name: isCustom ? customName.trim() : null,
        score: scoreValue,
        max_score: maxScore,
        test_date: testDate,
      }),
    );
    if (!ok) return;
    setScore("");
    setCustomName("");
    setCustomMaxScore("100");
    setTestDate(today);
    onAdded();
  }

  return (
    <Panel title="Add a test score" className="lg:sticky lg:top-24">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote message={error} />}
        <Field label="Test" htmlFor="test-type">
          <SelectInput
            id="test-type"
            value={testType}
            onChange={(e) => setTestType(e.target.value as TestTypeKey)}
          >
            {STANDARD_TESTS.map((test) => (
              <option key={test.key} value={test.key}>
                {test.label}
              </option>
            ))}
            <option value={CUSTOM_TEST_KEY}>Other (custom)</option>
          </SelectInput>
        </Field>

        {isCustom && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Test name" htmlFor="test-custom-name">
              <TextInput
                id="test-custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. CLT, IB, TOEFL"
              />
            </Field>
            <Field label="Out of" htmlFor="test-max-score">
              <TextInput
                id="test-max-score"
                type="number"
                min="1"
                step="1"
                value={customMaxScore}
                onChange={(e) => setCustomMaxScore(e.target.value)}
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Score"
            htmlFor="test-score"
            hint={!isCustom ? `Out of ${maxScore}` : undefined}
          >
            <TextInput
              id="test-score"
              type="number"
              min="0"
              max={isCustom ? undefined : maxScore}
              step="1"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </Field>
          <Field label="Date" htmlFor="test-date">
            <TextInput
              id="test-date"
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </Field>
        </div>

        <Button type="submit" icon={Plus} busy={busy} className="w-full">
          Add test score
        </Button>
      </form>
    </Panel>
  );
}
