/** Popular standardized tests, each with its official max score. */
export const STANDARD_TESTS = [
  { key: "SAT", label: "SAT", maxScore: 1600 },
  { key: "ACT", label: "ACT", maxScore: 36 },
  { key: "PSAT/NMSQT", label: "PSAT/NMSQT", maxScore: 1520 },
  { key: "PSAT 10", label: "PSAT 10", maxScore: 1520 },
  { key: "PSAT 8/9", label: "PSAT 8/9", maxScore: 1440 },
] as const;

export type StandardTestKey = (typeof STANDARD_TESTS)[number]["key"];

/** Sentinel `test_type` for a test the student names themselves. */
export const CUSTOM_TEST_KEY = "Custom";

export type TestTypeKey = StandardTestKey | typeof CUSTOM_TEST_KEY;

export function maxScoreFor(testType: string): number | undefined {
  return STANDARD_TESTS.find((t) => t.key === testType)?.maxScore;
}
