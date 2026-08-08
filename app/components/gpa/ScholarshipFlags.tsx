import { Award, CheckCircle2, Circle, Info } from "lucide-react";

/*
  General reference benchmarks only. Real eligibility for NHS, Latin honors,
  and merit scholarships is set by each chapter/school/scholarship
  individually and varies widely — this is not an eligibility determination.
*/
const BENCHMARKS = [
  {
    id: "nhs",
    label: "National Honor Society (typical)",
    min: 3.0,
    note: "Most chapters use a 3.0 unweighted floor, but each chapter sets its own bar.",
  },
  {
    id: "cum-laude",
    label: "Cum Laude (typical)",
    min: 3.5,
    note: "Common Latin-honors cutoff — your school sets the exact number.",
  },
  {
    id: "competitive",
    label: "Competitive-admissions range",
    min: 3.7,
    note: "Informal benchmark often cited for selective college applicant pools.",
  },
  {
    id: "magna",
    label: "Magna Cum Laude (typical)",
    min: 3.75,
    note: "Common second-tier Latin-honors cutoff.",
  },
  {
    id: "summa",
    label: "Summa Cum Laude (typical)",
    min: 3.9,
    note: "Common top-tier Latin-honors cutoff.",
  },
];

export function ScholarshipFlags({ unweightedGpa }: { unweightedGpa: number }) {
  return (
    <div className="border border-rule rounded-lg p-6 bg-paper">
      <div className="flex items-center gap-2 mb-1.5">
        <Award className="w-4 h-4 text-pen" />
        <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">
          Scholarship &amp; honors benchmarks
        </p>
      </div>
      <p className="text-ink-soft text-xs leading-relaxed mb-4">
        Based on your {unweightedGpa.toFixed(2)} unweighted GPA. General reference only —
        not an eligibility determination.
      </p>

      <ul className="space-y-2.5">
        {BENCHMARKS.map((b) => {
          const met = unweightedGpa >= b.min;
          return (
            <li key={b.id} className="flex items-start gap-2.5">
              {met ? (
                <CheckCircle2 className="w-4 h-4 text-pen shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-ink-soft/40 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${met ? "text-ink" : "text-ink-soft"}`}>
                  {b.label}{" "}
                  <span className="course-code text-[0.65rem] text-ink-soft">
                    ({b.min.toFixed(2)}+)
                  </span>
                </p>
                <p className="text-ink-soft text-xs leading-relaxed">{b.note}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="flex items-start gap-1.5 text-ink-soft text-xs leading-relaxed mt-4 pt-4 border-t border-rule">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Always confirm exact cutoffs with your counselor, NHS chapter, or the specific
        scholarship — these numbers are commonly cited defaults, not your school's policy.
      </p>
    </div>
  );
}
