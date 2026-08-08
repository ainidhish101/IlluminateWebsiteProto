/*
  Texas ISD GPA weighting reference data.

  Source: Texas_School_Districts_GPA_Standards.xlsx (user-supplied), sheet
  "TX School District GPA Scales" — a compiled reference of 20 major Texas
  ISDs' published GPA policies as of the 2023–2024+ academic planning
  guides. Each district's `note` field is drawn directly from that sheet's
  "Policy Notes & Weighting Details" column.

  Four different weighting mechanisms show up in the source data:
    - Additive bonus over a 4.0 base (most districts): A=4.0 + a fixed
      bump per course level (e.g. +0.5 Honors, +1.0 AP/IB).
    - 100-point + bonus (Fort Bend, Northside, North East, Eanes): raw
      0–100 averages with flat bonus points added for advanced courses —
      no letter-grade conversion at all.
    - Level-lookup tables (Cypress-Fairbanks, Round Rock, Conroe): each
      course "level" has its own top-to-bottom point scale, not a bonus
      added to a shared base.
    - A multiplier formula (Lewisville): a 5.0-point base scale multiplied
      by 1.0/1.1/1.2 depending on course level.

  Rather than modeling four calculation engines, every mechanism is
  normalized here into the same shape: a per-course-type table of
  letter-grade → points (or a flat bonus, for 100-point districts). That's
  the one representation general enough to cover all four, and it's also
  the fix for "different districts treat a different letter as the max" —
  since every letter's value is explicit per course type, there's no
  shared assumption about which grade anchors the scale.

  The source sheet only gives whole-letter anchors (A/B/C/D). Anywhere a
  district's exact +/- breakdown wasn't published, `letterTable()` fills
  the gap using the standard national +/-0.3-per-half-step convention,
  scaled to that course type's top value — flagged in the UI as an
  Illuminate estimate, not sourced from the district.
*/

export type GradeLetter =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "F";

export const GRADE_LETTERS: GradeLetter[] = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "F",
];

export type CourseTypeDef = {
  id: string;
  label: string;
  /** Letter-scale systems: full grade → points table, pre-weighted. */
  points?: Record<GradeLetter, number>;
  /** 100-point systems: bonus added straight to the raw numeric average. */
  bonus?: number;
  /** True where the exact sub-letter breakdown was estimated, not sourced. */
  estimated?: boolean;
};

export type GpaSystem = {
  id: string;
  label: string;
  region: string;
  scaleType: "letter" | "raw100";
  maxScale: string;
  courseTypes: CourseTypeDef[];
  note: string;
  /** true for the one non-district generic fallback. */
  isDefault?: boolean;
};

/**
 * Standard national +/- step (0.3 per half-grade, 0 at F) scaled to a
 * course type's top ("A") value. Only the A/B/C/D anchors below F are
 * ever sourced from a district; everything else is this interpolation.
 */
function letterTable(aValue: number): Record<GradeLetter, number> {
  return {
    "A+": aValue,
    A: aValue,
    "A-": round2(aValue - 0.3),
    "B+": round2(aValue - 0.7),
    B: round2(aValue - 1.0),
    "B-": round2(aValue - 1.3),
    "C+": round2(aValue - 1.7),
    C: round2(aValue - 2.0),
    "C-": round2(aValue - 2.3),
    "D+": round2(aValue - 2.7),
    D: round2(aValue - 3.0),
    F: 0,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function letterType(id: string, label: string, aValue: number, estimated = false): CourseTypeDef {
  return { id, label, points: letterTable(aValue), estimated };
}

function bonusType(id: string, label: string, bonus: number): CourseTypeDef {
  return { id, label, bonus };
}

export const DEFAULT_SYSTEM: GpaSystem = {
  id: "illuminate-standard",
  label: "Illuminate Standard (4.0 / 4.5 / 5.0)",
  region: "General / not Texas-specific",
  scaleType: "letter",
  maxScale: "5.0",
  courseTypes: [
    letterType("regular", "Regular", 4.0),
    letterType("honors", "Honors / Pre-AP", 4.5),
    letterType("ap_ib", "AP / IB / Dual Enrollment", 5.0),
  ],
  note: "Illuminate's general default — most U.S. districts use a similar +0.5 Honors / +1.0 AP-IB weighting. Select your exact district below if it's listed, or build a custom scale.",
  isDefault: true,
};

export const TEXAS_ISD_SYSTEMS: GpaSystem[] = [
  {
    id: "houston-isd",
    label: "Houston ISD",
    region: "Houston Area",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Honors / Pre-AP", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "District-wide standard policy; magnet programs may vary slightly.",
  },
  {
    id: "katy-isd",
    label: "Katy ISD",
    region: "Houston Area",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Academic (Regular)", 4.0),
      letterType("kap", "KAP (Katy Advanced Program)", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "KAP classes receive +0.5 weight; AP/IB receive +1.0 weight.",
  },
  {
    id: "cyfair-isd",
    label: "Cypress-Fairbanks ISD",
    region: "Houston Area",
    scaleType: "letter",
    maxScale: "7.0",
    courseTypes: [
      letterType("regular", "Regular (L-Level)", 5.0),
      letterType("honors", "Honors (K-Level / Horizon)", 6.0),
      letterType("dual_credit", "Dual Credit (Advanced)", 6.0),
      letterType("ap_ib", "AP / IB (K-Level)", 7.0),
    ],
    note: "Uses a 7.0 max scale for K-Level/AP courses; 5.0 base for regular (L-Level) courses.",
  },
  {
    id: "fortbend-isd",
    label: "Fort Bend ISD",
    region: "Houston Area",
    scaleType: "raw100",
    maxScale: "100+",
    courseTypes: [
      bonusType("regular", "Regular (unweighted)", 0),
      bonusType("honors", "Honors / AAC", 5),
      bonusType("dual_credit", "Dual Credit", 5),
      bonusType("ap_ib", "AP / IB", 10),
    ],
    note: "Uses AAC (Advanced Academic Courses) and AP/IB grade weights on a 100-point scale.",
  },
  {
    id: "dallas-isd",
    label: "Dallas ISD",
    region: "Dallas/Fort Worth",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Tier 3 (Regular)", 4.0),
      letterType("honors", "Tier 2 (Honors / Dual Credit)", 4.5),
      letterType("ap_ib", "Tier 1 (AP / IB)", 5.0),
    ],
    note: "Tiered weighting system: Tier 1 (AP/IB), Tier 2 (Honors/DC), Tier 3 (Regular).",
  },
  {
    id: "frisco-isd",
    label: "Frisco ISD",
    region: "Dallas/Fort Worth",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Advanced / Honors", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "Tiered GPA calculation updated for 2023–2024+ entering cohorts.",
  },
  {
    id: "plano-isd",
    label: "Plano ISD",
    region: "Dallas/Fort Worth",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular / On-Level", 4.0),
      letterType("honors", "Honors / IH", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "Honors/IH weighted at 4.5 max; AP/IB weighted at 5.0 max.",
  },
  {
    id: "lewisville-isd",
    label: "Lewisville ISD",
    region: "Dallas/Fort Worth",
    scaleType: "letter",
    maxScale: "6.0",
    courseTypes: [
      letterType("regular", "Regular (1.0x)", 5.0),
      letterType("honors", "Honors (1.1x)", 5.5),
      letterType("dual_credit", "Dual Credit (1.1x)", 5.5),
      letterType("ap_ib", "AP / IB (1.2x)", 6.0),
    ],
    note: "Weights calculated via grade-point multiplier formula (1.2× AP/IB, 1.1× Honors/Dual Credit, 1.0× Regular) on a 5.0-point base scale.",
  },
  {
    id: "austin-isd",
    label: "Austin ISD",
    region: "Austin Area",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Honors / Pre-AP", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "Add-on point system applied to standard 4.0 unweighted GPA base.",
  },
  {
    id: "roundrock-isd",
    label: "Round Rock ISD",
    region: "Austin Area",
    scaleType: "letter",
    maxScale: "6.0",
    courseTypes: [
      letterType("regular", "Level 1 (Academic)", 5.0, true),
      letterType("honors", "Level 2 (Honors)", 5.5, true),
      letterType("dual_credit", "Level 2 (Dual Credit)", 5.5, true),
      letterType("ap_ib", "Level 3 (AP / IB)", 6.0, true),
    ],
    note: "3-tier numeric conversion matrix based on raw numerical grade; letter-grade points shown are Illuminate's standard-step estimate of that matrix.",
  },
  {
    id: "northside-isd",
    label: "Northside ISD",
    region: "San Antonio",
    scaleType: "raw100",
    maxScale: "100+",
    courseTypes: [
      bonusType("regular", "Regular (raw grade)", 0),
      bonusType("honors", "Honors / AAC", 5),
      bonusType("dual_credit", "Dual Credit", 5),
      bonusType("ap_ib", "AP / IB", 8),
    ],
    note: "Numeric GPA system; bonus points added to raw semester average.",
  },
  {
    id: "northeast-isd",
    label: "North East ISD",
    region: "San Antonio",
    scaleType: "raw100",
    maxScale: "100+",
    courseTypes: [
      bonusType("regular", "Regular (raw grade)", 0),
      bonusType("honors", "Pre-AP / Honors", 5),
      bonusType("dual_credit", "Dual Credit", 5),
      bonusType("ap_ib", "AP / IB", 10),
    ],
    note: "Pre-AP/Pre-IB receive 5 bonus points; AP/IB receive 10 bonus points.",
  },
  {
    id: "elpaso-isd",
    label: "El Paso ISD",
    region: "West Texas",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Pre-AP / Honors", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "Standard 5.0-scale conversion for advanced academic courses.",
  },
  {
    id: "conroe-isd",
    label: "Conroe ISD",
    region: "Houston Area",
    scaleType: "letter",
    maxScale: "6.0",
    courseTypes: [
      letterType("regular", "Level 1 (Regular)", 5.0, true),
      letterType("honors", "Level 2 (Honors)", 5.5, true),
      letterType("dual_credit", "Level 2 (Dual Credit)", 5.5, true),
      letterType("ap_ib", "Level 3 (AP / IB)", 6.0, true),
    ],
    note: "6-point grading system where 100 in Level 3 = 6.0, Level 1 = 5.0; letter-grade points are Illuminate's standard-step estimate.",
  },
  {
    id: "clearcreek-isd",
    label: "Clear Creek ISD",
    region: "Houston Area",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Honors", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "Updated rank and GPA policy for graduating classes 2024 and beyond.",
  },
  {
    id: "arlington-isd",
    label: "Arlington ISD",
    region: "Dallas/Fort Worth",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Honors", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "5.0 scale for AP/IB; Dual Credit and Honors calculated on a 4.5 weighted scale.",
  },
  {
    id: "garland-isd",
    label: "Garland ISD",
    region: "Dallas/Fort Worth",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Honors", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "Unweighted 4.0 base with weighted add-on points for class rank.",
  },
  {
    id: "lubbock-isd",
    label: "Lubbock ISD",
    region: "West Texas",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Honors", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "Standard West Texas regional weighted GPA matrix.",
  },
  {
    id: "corpuschristi-isd",
    label: "Corpus Christi ISD",
    region: "South Texas",
    scaleType: "letter",
    maxScale: "5.0",
    courseTypes: [
      letterType("regular", "Regular", 4.0),
      letterType("honors", "Pre-AP / Honors", 4.5),
      letterType("dual_credit", "Dual Credit", 4.5),
      letterType("ap_ib", "AP / IB", 5.0),
    ],
    note: "5.0 tier reserved for AP/IB; 4.5 tier for Pre-AP/Dual Credit.",
  },
  {
    id: "eanes-isd",
    label: "Eanes ISD",
    region: "Austin Area",
    scaleType: "raw100",
    maxScale: "100+",
    courseTypes: [
      bonusType("regular", "Regular (raw grade)", 0),
      bonusType("honors", "Pre-AP / Honors", 5),
      bonusType("dual_credit", "Dual Credit", 5),
      bonusType("ap_ib", "AP / IB", 10),
    ],
    note: "Exemplary district using weighted 100-point scale for class rank.",
  },
];

export const ALL_GPA_SYSTEMS: GpaSystem[] = [DEFAULT_SYSTEM, ...TEXAS_ISD_SYSTEMS];

export function getGpaSystem(id: string): GpaSystem | undefined {
  return ALL_GPA_SYSTEMS.find((s) => s.id === id);
}

/** Unweighted 4.0-scale value for a letter grade — used for the comparison column regardless of district. */
export const UNWEIGHTED_4_0: Record<GradeLetter, number> = letterTable(4.0);

/** Rough raw-100-average → 4.0 equivalent, for districts whose native scale is numeric. Standard national conversion. */
export function raw100ToUnweighted4(raw: number): number {
  if (raw >= 97) return 4.0;
  if (raw >= 93) return 4.0;
  if (raw >= 90) return 3.7;
  if (raw >= 87) return 3.3;
  if (raw >= 83) return 3.0;
  if (raw >= 80) return 2.7;
  if (raw >= 77) return 2.3;
  if (raw >= 73) return 2.0;
  if (raw >= 70) return 1.7;
  if (raw >= 67) return 1.3;
  if (raw >= 65) return 1.0;
  return 0;
}
