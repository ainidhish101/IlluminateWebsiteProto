import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { TextInput, SelectInput } from "../../auth";
import {
  GRADE_LETTERS,
  type CourseTypeDef,
  type GpaSystem,
  type GradeLetter,
} from "../../data/gpaSystems";

/*
  Free-form GPA system editor for districts that aren't in the Texas ISD
  preset list (or students outside Texas entirely).

  The requirement this solves: districts don't agree on which letter grade
  anchors their weighted max — some cap the scale at a plain "A", others
  let "A+" run higher than "A" (e.g. A+ = 5.3 on a "5.0" scale). Rather
  than assume one convention, each course type here exposes both the A and
  A+ points directly, and a "customize every grade" toggle for full manual
  control over the other ten letters when the standard 0.3-per-step
  interpolation doesn't match the real policy.
*/

function stepFrom(aValue: number): Record<GradeLetter, number> {
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    "A+": aValue,
    A: aValue,
    "A-": r(aValue - 0.3),
    "B+": r(aValue - 0.7),
    B: r(aValue - 1.0),
    "B-": r(aValue - 1.3),
    "C+": r(aValue - 1.7),
    C: r(aValue - 2.0),
    "C-": r(aValue - 2.3),
    "D+": r(aValue - 2.7),
    D: r(aValue - 3.0),
    F: 0,
  };
}

// Only for ids created after mount (Add level clicks) — never for the
// useState initializer below, where SSR and hydration must agree exactly.
let uid = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${uid++}`;

export function emptyCustomSystem(): GpaSystem {
  return {
    id: "custom",
    label: "My district",
    region: "Custom",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      { id: "custom-regular", label: "Regular", points: stepFrom(4.0) },
      { id: "custom-honors", label: "Honors", points: stepFrom(4.5) },
      { id: "custom-ap-ib", label: "AP / IB", points: stepFrom(5.0) },
    ],
    note: "Custom scale — you're responsible for matching your school's actual policy.",
  };
}

export function CustomSystemBuilder({
  system,
  onChange,
}: {
  system: GpaSystem;
  onChange: (next: GpaSystem) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-[1fr_auto] gap-4">
        <div>
          <label
            htmlFor="custom-district-name"
            className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
          >
            District or school name
          </label>
          <TextInput
            id="custom-district-name"
            value={system.label}
            onChange={(e) => onChange({ ...system, label: e.target.value })}
            placeholder="e.g. Riverside High School"
          />
        </div>
        <div>
          <label
            htmlFor="custom-scale-type"
            className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
          >
            How grades are recorded
          </label>
          <SelectInput
            id="custom-scale-type"
            value={system.scaleType}
            onChange={(e) => {
              const scaleType = e.target.value as GpaSystem["scaleType"];
              onChange({
                ...system,
                scaleType,
                courseTypes: system.courseTypes.map((t) =>
                  scaleType === "letter"
                    ? { id: t.id, label: t.label, points: t.points ?? stepFrom(4.0) }
                    : { id: t.id, label: t.label, bonus: t.bonus ?? 0 },
                ),
              });
            }}
          >
            <option value="letter">Letter grades (A, B+, C-...)</option>
            <option value="raw100">Raw numeric average (0–100)</option>
          </SelectInput>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft">
            Course levels &amp; weighting
          </p>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...system,
                courseTypes: [
                  ...system.courseTypes,
                  {
                    id: nextId("ct"),
                    label: "New level",
                    ...(system.scaleType === "letter"
                      ? { points: stepFrom(4.0) }
                      : { bonus: 0 }),
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add level
          </button>
        </div>

        <div className="space-y-3">
          {system.courseTypes.map((type, i) => (
            <CourseTypeRow
              key={type.id}
              type={type}
              scaleType={system.scaleType}
              canRemove={system.courseTypes.length > 1}
              onChange={(next) =>
                onChange({
                  ...system,
                  courseTypes: system.courseTypes.map((t, j) => (j === i ? next : t)),
                })
              }
              onRemove={() =>
                onChange({
                  ...system,
                  courseTypes: system.courseTypes.filter((_, j) => j !== i),
                })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CourseTypeRow({
  type,
  scaleType,
  canRemove,
  onChange,
  onRemove,
}: {
  type: CourseTypeDef;
  scaleType: GpaSystem["scaleType"];
  canRemove: boolean;
  onChange: (next: CourseTypeDef) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (scaleType === "raw100") {
    return (
      <div className="border border-rule rounded-lg p-4 bg-paper-dim grid grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <label className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5">
            Level name
          </label>
          <TextInput
            value={type.label}
            onChange={(e) => onChange({ ...type, label: e.target.value })}
          />
        </div>
        <div>
          <label className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5">
            Bonus points
          </label>
          <input
            type="number"
            value={type.bonus ?? 0}
            onChange={(e) => onChange({ ...type, bonus: Number(e.target.value) || 0 })}
            className="w-24 px-3 py-2 bg-paper border border-rule rounded-md text-ink text-sm focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove ${type.label}`}
          className="p-2 mb-0.5 text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const points = type.points ?? stepFrom(4.0);
  const aValue = points.A;
  const aPlusValue = points["A+"];

  function setAnchor(nextA: number, nextAPlus: number) {
    const table = stepFrom(nextA);
    onChange({ ...type, points: { ...table, A: nextA, "A+": nextAPlus }, estimated: false });
  }

  return (
    <div className="border border-rule rounded-lg p-4 bg-paper-dim">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
        <div>
          <label className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5">
            Level name
          </label>
          <TextInput
            value={type.label}
            onChange={(e) => onChange({ ...type, label: e.target.value })}
          />
        </div>
        <div>
          <label className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5">
            Points for A
          </label>
          <input
            type="number"
            step={0.1}
            value={aValue}
            onChange={(e) => setAnchor(Number(e.target.value) || 0, aPlusValue)}
            className="w-24 px-3 py-2 bg-paper border border-rule rounded-md text-ink text-sm focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20"
          />
        </div>
        <div>
          <label
            className="block font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft mb-1.5"
            title="Some districts let A+ exceed the district's stated max. Leave equal to A if yours doesn't."
          >
            Points for A+
          </label>
          <input
            type="number"
            step={0.1}
            value={aPlusValue}
            onChange={(e) => setAnchor(aValue, Number(e.target.value) || 0)}
            className="w-24 px-3 py-2 bg-paper border border-rule rounded-md text-ink text-sm focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove ${type.label}`}
          className="p-2 mb-0.5 text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-pen hover:text-pen-dim transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? "Hide" : "Customize"} every grade
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {GRADE_LETTERS.map((letter) => (
            <div key={letter}>
              <label className="block font-mono text-[0.6rem] uppercase tracking-wide text-ink-soft mb-1">
                {letter}
              </label>
              <input
                type="number"
                step={0.1}
                value={points[letter]}
                onChange={(e) =>
                  onChange({
                    ...type,
                    points: { ...points, [letter]: Number(e.target.value) || 0 },
                    estimated: false,
                  })
                }
                className="w-full px-2 py-1.5 bg-paper border border-rule rounded-md text-ink text-xs focus:outline-none focus:border-pen focus:ring-2 focus:ring-pen/20"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
