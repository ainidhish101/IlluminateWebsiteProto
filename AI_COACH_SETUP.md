# AI Academic Coach — setup

The code is written. These steps need your accounts, so they're yours to run.
About 20 minutes, most of it waiting on signups.

Until step 4, the dashboard still works — the coach button opens a panel that
explains it isn't connected yet.

**Prerequisite:** `SUPABASE_SETUP.md` finished (schema applied, `.env` filled
in, you can sign in).

---

## What you're setting up

| Piece | Where it runs | Cost |
|---|---|---|
| `advisor-coach` Edge Function | Supabase | Free tier: 500K invocations/mo |
| Gemini 2.5 Flash-Lite | Google AI Studio | Free tier available — read step 2 |
| Google Custom Search | Google | Free: 100 queries/day |

Everything here can run free. Step 2 has one privacy tradeoff worth reading
before you decide which tier to use.

---

## 1. Run the coach schema

Supabase → **SQL Editor** → **New query** → paste all of
`supabase/ai-coach.sql` → **Run**.

This adds three tables (`coach_conversations`, `coach_messages`,
`coach_usage`), their RLS policies and grants, and the daily-quota functions.

Verify:

```sql
select public.coach_quota_remaining();   -- expect 25
```

## 2. Get a Gemini API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and
   sign in with a Google account.
2. **Create API key**. Copy it — it starts with `AIza...`.

**Which tier — this is the real decision.**

The free tier costs nothing and needs no card. The catch, straight from
Google's pricing page: on the **free tier**, your prompts and responses may be
used to improve Google's products. The **paid tier** does not carry that
clause.

That matters more here than for a typical side project, because the prompt
payload is a minor's academic record — GPA, courses, activities, goals. The
function already strips names, emails, and IDs before anything is sent
(see the privacy section below), so what leaves is de-identified. Whether
de-identified student academic data on a data-use-permitted tier is
acceptable is a judgment call for your nonprofit, not one I should make
quietly on your behalf.

To use the paid tier instead, link a billing account to the key's Google
Cloud project in AI Studio. The model stays the same; only the terms and the
rate limits change.

**What the paid tier costs.** The coach uses `gemini-2.5-flash-lite` at $0.10
per million input tokens and $0.40 per million output — deliberately the
cheapest current Gemini model. A typical rating is roughly 4–8K input and 1–2K
output, which is a **small fraction of a cent per rating**. Even a 30-student
cohort using it daily is pocket change; the 25 calls/student/day cap exists to
catch runaway loops, not to ration a meaningful expense.

> **Careful with "newer means cheaper" here** — it doesn't hold. Gemini 3.1
> Flash-Lite ($0.25/$1.50) and 3.5 Flash-Lite ($0.30/$2.50) both cost
> substantially *more* than the 2.5 Flash-Lite this is pinned to, despite the
> higher version numbers. If you upgrade the model, check the pricing page
> first rather than assuming.

Two levers if you want to spend even less:

- **Lower the daily cap** — edit `coach_daily_limit()` in
  `supabase/ai-coach.sql` (default 25) and re-run the file.
- **Trim output ceilings** — `MODE_CONFIG` in
  `supabase/functions/advisor-coach/index.ts` caps `maxOutputTokens` per mode.

## 3. (Optional) Free web search

Only affects **Find matched opportunities**. Skip it and the coach still
answers, but from general knowledge rather than live results — and it says so.

1. **API key** — [Custom Search JSON API](https://developers.google.com/custom-search/v1/introduction)
   → **Get a Key** → create/select a project. Free, no billing needed.
2. **Search engine ID** — [programmablesearchengine.google.com](https://programmablesearchengine.google.com/controlpanel/create)
   → **Add**. Name it anything, choose **Search the entire web**, create, then
   copy the **Search engine ID** from its Overview page.

Free tier is 100 queries/day, one query per "Find opportunities" press.

## 4. Deploy the function

Install the Supabase CLI if you don't have it:

```bash
npm install -g supabase
```

Log in and link the project (project ref is in your Supabase URL —
`awacbgjdyaypulrxpgui`):

```bash
supabase login
```

```bash
supabase link --project-ref awacbgjdyaypulrxpgui
```

Set the secrets (these live on Supabase, never in your repo or browser):

```bash
supabase secrets set GEMINI_API_KEY=AIza-your-key-here
```

Only if you did step 3:

```bash
supabase secrets set GOOGLE_SEARCH_API_KEY=your-google-key GOOGLE_SEARCH_ENGINE_ID=your-engine-id
```

Deploy:

```bash
supabase functions deploy advisor-coach
```

> **No `--no-verify-jwt`.** Leaving JWT verification on means Supabase rejects
> unauthenticated calls before your function runs — the first layer of the
> auth boundary. The function then re-checks the user itself.

## 5. Try it

Open `/dashboard`, click **Ask your coach** (bottom-right), then
**Rate my application**.

With an empty profile you should get low scores *and* a "this rating is
incomplete" panel listing what to fill in — that's the intended behavior, not
a bug. Add a few courses and activities, rate again, and the scores should
move.

---

## Environment variables, all together

| Variable | Where it goes | Required | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` + host build vars | ✅ | Browser → Supabase |
| `VITE_SUPABASE_ANON_KEY` | `.env` + host build vars | ✅ | Browser → Supabase |
| `GEMINI_API_KEY` | **Supabase secrets only** | ✅ | Server-side model calls |
| `GOOGLE_SEARCH_API_KEY` | Supabase secrets | ➖ | Live opportunity search |
| `GOOGLE_SEARCH_ENGINE_ID` | Supabase secrets | ➖ | Live opportunity search |
| `ALLOWED_ORIGIN` | Supabase secrets | ➖ | Locks CORS to your domain |

**The Gemini key must never appear in `.env` or any `VITE_` variable.**
Anything prefixed `VITE_` is compiled into the JavaScript every visitor
downloads. `supabase secrets set` keeps the key server-side, which is the
entire reason the coach runs in an Edge Function instead of the browser.

Once you have a production domain, lock down CORS:

```bash
supabase secrets set ALLOWED_ORIGIN=https://your-domain.workers.dev
```

---

## How the privacy boundary works

Worth understanding before students use this.

**What the model sees:** first name, grade level, stated interests, and the
academic/activity/goal/hours data from the dashboard.

**What it never sees:** email addresses, user IDs, surnames, uploaded
transcript files, or anything belonging to another student. `buildContext()`
in `supabase/functions/advisor-coach/prompt.ts` is the single place student
data becomes prompt text, and it strips emails and UUIDs from free-text
fields on the way through — including from student-authored text like goal
notes, where an address could otherwise slip in.

**Why one student can't read another's data:** the function queries Supabase
using *the caller's own JWT*, so RLS scopes every read exactly as it does in
the browser. It deliberately does **not** use the service-role key, which
would bypass every policy in the schema.

**Coaching transcripts are private.** `coach_conversations` and
`coach_messages` have owner-only policies with no Officer or Director
override — a Director cannot read a student's coaching history. That's a
deliberate choice: advice people think is monitored isn't advice they'll ask
for honestly. If you ever need aggregate usage stats, query `coach_usage`
counts rather than adding a read policy on the transcripts.

---

## If something breaks

**"The coach isn't configured yet — GEMINI_API_KEY is not set"** — the
secret didn't land. Re-run `supabase secrets set`, then **redeploy** — secrets
apply at deploy time.

**"You've hit today's coaching limit"** — 25 calls used. Resets midnight UTC,
or raise `coach_daily_limit()`.

**"permission denied for table coach_messages"** — `ai-coach.sql` didn't
finish. Re-run it; section 4 grants table privileges, which are separate from
RLS policies.

**"Failed to send a request to the Edge Function"** — not deployed, or the
name is wrong. `supabase functions list` should show `advisor-coach`.

**"The coach couldn't answer that" on every request** — usually a rejected
request shape or an invalid key. Check the actual Gemini error:
`supabase functions logs advisor-coach`. A 400 mentioning `responseSchema`
means the rating schema was rejected — see `RATING_SCHEMA` in `prompt.ts`.

**Free-tier rate limits** — the free tier caps requests per minute and per
day across your whole project, not per student. A cohort using the coach at
once can hit it and see "The coach is busy right now." Either stagger usage or
move the key to the paid tier.

**Opportunities have no sources** — search isn't configured (step 3 skipped),
or the 100/day free quota is used up. The answer still works; it's just not
live. Check logs: `supabase functions logs advisor-coach`.

**Rating scores look too harsh** — that's calibrated deliberately. The prompt
tells the model a typical unremarkable profile is 4–6 out of 10, because a
coach that scores everyone an 8 is useless. Edit `MODE_INSTRUCTIONS.rate` in
`prompt.ts` if you want a different bar.
