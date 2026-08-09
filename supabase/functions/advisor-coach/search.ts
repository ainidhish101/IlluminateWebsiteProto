/*
  Free live web search for the opportunity matcher.

  PROVIDER CHOICE — why Google Custom Search:
  A genuinely free, keyless, high-quality web search API does not exist.
  DuckDuckGo's Instant Answer API is keyless but returns almost nothing for
  queries like "summer research programs for high school students". Google's
  Custom Search JSON API gives 100 queries/day free with no billing account
  attached, which is the best free tier available and enough for a small
  cohort. Setup is two values, both free — see AI_COACH_SETUP.md.

  If search isn't configured, `runSearch` returns null rather than throwing.
  The model is then told explicitly that it is working from general knowledge,
  which is honest and still useful — it just can't promise live deadlines.

  UPGRADE PATH: Gemini has a built-in Google Search grounding tool that needs
  no separate key and returns better-integrated results. It bills per request
  on the paid tier (with a monthly free allowance), so it's the natural next
  step if this outgrows the 100/day Custom Search quota.
*/

export type SearchResult = { title: string; url: string; snippet: string };

const GOOGLE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

/** Both values come from the Google Programmable Search Engine console. */
const API_KEY = Deno.env.get("GOOGLE_SEARCH_API_KEY");
const ENGINE_ID = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID");

export const isSearchConfigured = Boolean(API_KEY && ENGINE_ID);

/**
 * Runs one search. Returns null when unconfigured or when the call fails —
 * a dead search provider must degrade the answer, never break the request.
 */
export async function runSearch(query: string): Promise<SearchResult[] | null> {
  if (!isSearchConfigured) return null;

  const url = new URL(GOOGLE_ENDPOINT);
  url.searchParams.set("key", API_KEY!);
  url.searchParams.set("cx", ENGINE_ID!);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "8");
  // Bias toward pages updated in the last year; deadlines go stale fast.
  url.searchParams.set("dateRestrict", "y1");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("search failed", response.status, await response.text());
      return null;
    }

    const body = await response.json();
    const items = Array.isArray(body.items) ? body.items : [];
    return items.slice(0, 8).map((item: Record<string, string>) => ({
      title: String(item.title ?? "").slice(0, 200),
      url: String(item.link ?? ""),
      snippet: String(item.snippet ?? "").slice(0, 400),
    }));
  } catch (error) {
    console.warn("search threw", error);
    return null;
  }
}

/**
 * Builds the search query from the student's own interests so results are
 * matched rather than generic. Falls back to a broad query when the profile
 * has nothing to go on.
 */
export function buildQuery(interests: string | null, gradeLevel: string | null): string {
  const focus = (interests ?? "").trim().slice(0, 120);
  const year = new Date().getFullYear();
  const grade = (gradeLevel ?? "").match(/\d+/)?.[0];

  if (!focus) {
    return `free summer programs competitions internships high school students ${year}`;
  }
  return `${focus} summer programs competitions internships high school${
    grade ? ` grade ${grade}` : ""
  } ${year} application deadline`;
}

/** Formats results for the prompt. Kept plain so nothing reads as markup. */
export function formatResults(results: SearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    Snippet: ${r.snippet}`,
    )
    .join("\n\n");
}
