# Deploying to GitHub + Cloudflare

The site ships as a **Cloudflare Worker with static assets**. Public pages
(home, About, every guide, the GPA tool) are server-rendered on each request,
which is what keeps them indexable by Google. The dashboard is client-rendered
and talks to Supabase directly from the browser.

Supabase itself doesn't move. It's a separate hosted service, so the same
project serves localhost and production — no second database to maintain.

---

## Before you push: what must never be committed

`.gitignore` already covers these, but check before your first push:

| File | Why |
|---|---|
| `.env` | Your Supabase URL and key |
| `.dev.vars` | Wrangler's local copy of the same |
| `/build/` | Build output, regenerated on every deploy |
| `/.wrangler/` | Local runtime state |

After `git add -A`, run `git status` and confirm none of those appear. If
`.env` ever shows up as staged, stop and remove it (`git rm --cached .env`)
before committing.

> Your Supabase **publishable key** is browser-safe — it gets compiled into
> the JavaScript bundle and every visitor's browser can read it. That's by
> design; Row Level Security is what protects the data. The key you must never
> commit or deploy is the **Secret key** (`sb_secret_...`, formerly
> `service_role`), which bypasses every policy in `supabase/schema.sql`.

---

## 1. Push to GitHub

```bash
git init
git add -A
git status          # confirm no .env, no /build
git commit -m "Illuminate site + role-based dashboard"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## 2. Create the Cloudflare project

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** →
   **Create** → **Import a repository**.
2. Authorize GitHub, pick the repo.
3. Build settings:

   | Field | Value |
   |---|---|
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy -c build/server/wrangler.json` |

   Leave the output directory blank — `wrangler.jsonc` already points at
   `build/client` for assets.

## 3. Set the environment variables

**Settings → Environment variables → Production** (repeat for Preview if you
use preview branches):

```
VITE_SUPABASE_URL        = https://awacbgjdyaypulrxpgui.supabase.co
VITE_SUPABASE_ANON_KEY   = sb_publishable_...
VITE_GOOGLE_CALENDAR_ID  = (optional)
```

These are **build-time** variables: Vite bakes them into the bundle during
`npm run build`. Changing one requires a redeploy, not just a restart. This is
also why they're set here rather than in `wrangler.jsonc`.

## 4. Point Supabase at the live domain

Once Cloudflare gives you a URL (`illuminate.<subdomain>.workers.dev`, or your
custom domain):

**Supabase → Authentication → URL Configuration**

- **Site URL** → your production URL
- **Redirect URLs** → add both your production URL and
  `http://localhost:5173` so local development keeps working

Skip this and password-reset and confirmation emails will send people to
localhost.

## 5. Deploy

Cloudflare builds on every push to `main`. To deploy by hand instead:

```bash
npm run deploy
```

---

## Local commands

| Command | What it does |
|---|---|
| `npm run dev` | Day-to-day development. Node SSR, fast HMR. |
| `npm run preview` | Builds, then serves the **real Worker** in `workerd` — the runtime Cloudflare actually uses. Run this before a deploy if you've touched SSR. |
| `npm run deploy` | Builds and pushes to Cloudflare. |
| `npm run typecheck` | Regenerates route + Worker types, then runs `tsc`. |

### Why `dev` and `preview` use different runtimes

`@cloudflare/vite-plugin` can normally run the dev server inside `workerd`, so
development and production share one runtime. That doesn't work on this
project yet: the plugin is built for Vite 6/7, and under **Vite 8 + Rolldown**
its dev integration loads a second copy of React, so every server render fails
with `Invalid hook call`.

So `vite.config.ts` applies the plugin **to builds only**. The production
bundle is genuine Workers output — verified by `npm run preview` — while
`npm run dev` keeps the Node pipeline the app was built against.

The tradeoff: a Workers-only bug (using a Node API that doesn't exist there)
won't surface during `npm run dev`. `npm run preview` is the check for that.
When `@cloudflare/vite-plugin` supports Vite 8, delete the `command === "build"`
condition in `vite.config.ts` and both use `workerd`.

---

## Verifying a deploy

```bash
curl -s https://your-domain/ | grep -o "<title>.*</title>"
```

Server rendering is working if you get the real title back. A near-empty
response means it fell through to client-only rendering.

Then in a browser: log in, open `/dashboard`, and confirm the sidebar matches
your role. If the dashboard loads but every panel says **"Setup required"**,
the environment variables didn't reach the build — recheck step 3 and redeploy.

## Troubleshooting

**Build fails on Cloudflare but works locally** — check the build log for the
Node version. Set `NODE_VERSION` to `22` in the environment variables if it
picked something older.

**Dashboard panels empty in production, fine locally** — the env vars are
missing or misspelled in Cloudflare. They must be set for the environment
you're deploying (Production vs Preview), and a redeploy is required.

**Password reset emails point at localhost** — step 4 wasn't done.

**`Invalid hook call` during build** — this is the Vite 8 issue above. Confirm
`vite.config.ts` still has the `command === "build"` guard on the Cloudflare
plugin.
