# Dashboard setup — what you need to do

The code is done. These are the steps only you can do, because they need your
Supabase account. Budget about fifteen minutes.

Until step 3 is finished the site still runs: accounts fall back to
browser-local storage, and every dashboard panel shows a "Setup required" card
instead of an empty table.

---

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. **New project**. Pick a name (e.g. `illuminate`), a region close to your
   users, and a database password — save that password in your password
   manager, you won't be shown it again.
3. Wait for provisioning (~2 minutes).

## 2. Run the schema

1. In your project: **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy the whole file, paste it in.
3. Press **Run**.

You should see `Success. No rows returned`. That one script creates every
table, the enums, the signup trigger, all Row Level Security policies, and the
private `transcripts` storage bucket.

It's safe to re-run later — it recreates policies and triggers without
touching your data.

## 3. Add your keys

1. **Project Settings** → **API**.
2. Copy the **Project URL**, and the browser-safe key. Supabase renamed these,
   so depending on your project's age you'll see one of:
   - **Publishable key** — starts with `sb_publishable_` (newer projects)
   - **anon / public** — a long `eyJ...` JWT (older projects)

   Either one works. The variable is called `VITE_SUPABASE_ANON_KEY` in both
   cases.
3. In the project root, copy `.env.example` to `.env` and fill both in:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
```

4. Restart the dev server — Vite reads `.env` at startup, not per request.

> That key belongs in the browser and is not a secret; RLS is what protects
> your data. **Never** put the **Secret key** (`sb_secret_...`, formerly
> `service_role`) in this file — it bypasses every policy in the schema.

## 4. Turn off email confirmation (recommended to start)

**Authentication** → **Sign In / Providers** → **Email** → turn off
**Confirm email**, then Save.

With it on, a new signup gets no session until they click a link in their
inbox, and the signup form will tell them to go check it. Turn it back on when
you're ready to configure a real SMTP sender under **Authentication → Emails**.

## 5. Sign up as the first Director

Roles can only be changed by a Director — so the very first account has to
bootstrap itself, and the schema does that for one specific address.

`supabase/schema.sql` hardcodes a **seed admin email**
(`illuminate10102@gmail.com` — see `seed_admin_email()` near the top of
section 3). Anyone who signs up with that exact address gets `role = 'admin'`
automatically, at the moment their profile is created. Everyone else who
signs up, with any other address, still starts as a Member as normal.

1. On your own site, click **Sign up** and create an account using
   `illuminate10102@gmail.com` as the email.
2. Reload `/dashboard`. The Governance section should already be in the
   sidebar — no SQL editor step needed.

If you'd rather use a different address as the seed admin, change the string
returned by `seed_admin_email()` in `supabase/schema.sql` **before** running
it, then re-run the whole file.

> Changing your mind *after* you've already signed up with the old seed
> email? The backfill statement at the bottom of the script (section 7)
> re-promotes whatever address `seed_admin_email()` currently returns, so
> editing the function and re-running the file fixes it — you don't need to
> touch the SQL editor by hand.

From here on you never need the SQL editor for role changes: promote everyone
else from **Dashboard → User Management**.

## 6. Google Calendar (optional)

1. In Google Calendar, open the organization calendar's **Settings and
   sharing**.
2. Under **Access permissions**, tick **Make available to public**.
3. Under **Integrate calendar**, copy the **Calendar ID**.
4. Put it in `.env` as `VITE_GOOGLE_CALENDAR_ID`, restart the dev server.

Without it, the Calendar tab still shows each user's own goal and task
deadlines — just not the shared org calendar.

## 7. Deploying

Wherever you host (Vercel, Netlify, Fly, the included Dockerfile), set
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally
`VITE_GOOGLE_CALENDAR_ID` as build-time environment variables. They are
compiled into the bundle, so a rebuild is required after changing one.

Then in Supabase: **Authentication** → **URL Configuration** → set **Site URL**
to your production domain and add it to **Redirect URLs**, so password-reset
links point at the live site instead of localhost.

---

## Checking it worked

| Test | Where | Expected |
|---|---|---|
| Signup creates a profile | SQL editor: `select email, role from public.profiles;` | your address, role `member` — unless it's the seed admin address, which should show `admin` |
| Role gate works | Log in as a Member, visit `/dashboard/users` | "That tab is for DIRECTORs and above" |
| Officer filter works | Promote someone to Officer with category `Academics`, log in as them | Workstation shows only `Academics` submissions |
| Uploads work | Transcripts tab → drop a PDF | File appears in Storage → `transcripts` → `<your-user-id>/` |

## If something breaks

**"Your account exists but has no profile row"** — step 2 didn't finish. Re-run
`supabase/schema.sql`, then run the insert manually for existing users:

```sql
insert into public.profiles (id, email, role)
select id, email, 'member' from auth.users
on conflict (id) do nothing;
```

**"permission denied for table profiles"** (on signup or login) — the
`authenticated` role has no grant on the tables. RLS narrows access to a table;
it doesn't create that access in the first place, so both are needed. Run
`supabase/fix-grants.sql` in the SQL editor. It also backfills a profile for
anyone who signed up while the grants were missing.

**Dashboard panels show "Setup required"** — `.env` is missing, misspelled, or
the dev server wasn't restarted.

**"new row violates row-level security policy"** — you're attempting something
your role isn't allowed to do. That's the schema working. Check your role with
`select role from public.profiles where email = '…';`.

**Officer sees an empty workstation** — their `officer_category` doesn't match
any submission's `category` exactly, including capitalization. Both come from
`GUIDE_CATEGORIES` in `app/lib/roles.ts`; if you edit that list, update
existing rows to match.

**Signed up with the seed admin email but you're still a Member** — the
signup trigger only runs `handle_new_user()` as written *at the moment you ran
`schema.sql`*. If you signed up before running the script, or before adding
this seed-admin behavior to it, re-run the whole file — the backfill statement
in section 7 catches that case and promotes the address on its own. Also
double-check the email matches `seed_admin_email()` exactly (it's
case-insensitive, but a typo isn't).
