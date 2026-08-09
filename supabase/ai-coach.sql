-- ============================================================================
-- DELIVERABLE 4 — AI Coach schema, RLS, and the daily-quota RPC.
--
-- Run AFTER `supabase/schema.sql`. Paste the whole file into the Supabase SQL
-- editor and press Run. Safe to re-run: it recreates policies and functions
-- without touching stored conversations.
--
-- Three tables and one function:
--   coach_conversations  — one row per chat thread
--   coach_messages       — the turns, plus the rating JSON when there is one
--   coach_usage          — per-user, per-day call counter (quota enforcement)
--   coach_consume_quota()— SECURITY DEFINER; the only way the counter moves
--
-- WHY A SECURITY DEFINER COUNTER: if the quota table were writable by the
-- student, the quota would be advisory. The function owns the increment, runs
-- with elevated rights, and the RLS policies below grant students SELECT on
-- their own row and nothing else — so a client can read its remaining budget
-- but cannot reset it.
-- ============================================================================


-- ============================================================================
-- 1. TABLES
-- ============================================================================

create table if not exists public.coach_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'Coaching session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  -- 'chat' | 'rate' | 'opportunities' — which coach mode produced this turn.
  mode            text not null default 'chat',
  -- Structured rating payload; null on ordinary chat turns.
  rating          jsonb,
  -- Live search results cited in this answer; null when none were used.
  sources         jsonb,
  created_at      timestamptz not null default now()
);

-- One row per user per UTC day. `day` is part of the primary key so the
-- upsert in coach_consume_quota() is a single statement with no race.
--
-- Dropped and rebuilt on every run rather than `create table if not exists`:
-- an earlier draft of this script used a different column name here, and
-- `if not exists` would silently keep that stale shape forever instead of
-- picking up the fix. Safe to drop — it holds only today's disposable call
-- counters, nothing worth preserving across a schema change.
drop table if exists public.coach_usage cascade;
create table public.coach_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null default (now() at time zone 'utc')::date,
  calls   integer not null default 0,
  primary key (user_id, day)
);

create index if not exists coach_conversations_user_idx on public.coach_conversations (user_id, updated_at desc);
create index if not exists coach_messages_conversation_idx on public.coach_messages (conversation_id, created_at);
create index if not exists coach_messages_user_idx on public.coach_messages (user_id);


-- ============================================================================
-- 2. DAILY QUOTA
-- ============================================================================

-- Explicit drops before recreating: `create or replace` keeps a function's
-- compiled body current, but if the *previous* version is ever the one
-- actually executing (stale deploy, a version with different internals),
-- dropping first guarantees this run replaces it rather than layering on
-- top of something unknown. Cheap insurance given the alternative was an
-- hour of tracing a "column does not exist" error to a run from days ago.
drop function if exists public.coach_daily_limit() cascade;
drop function if exists public.coach_consume_quota() cascade;
drop function if exists public.coach_quota_remaining() cascade;

-- Calls allowed per student per UTC day. Gemini Flash-Lite is cheap but not
-- free on the paid tier, and the free tier is rate-limited — either way this
-- is the guard between a curious student and a surprise bill or a stalled
-- cohort. Raise it once you've seen a week of real usage.
create or replace function public.coach_daily_limit()
returns integer
language sql
immutable
as $$
  select 25;
$$;

-- Atomically increments today's counter and reports whether the call is
-- allowed. Returns false instead of raising so the Edge Function can send a
-- friendly 429 rather than a stack trace.
create or replace function public.coach_consume_quota()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into public.coach_usage (user_id, day, calls)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
    do update set calls = public.coach_usage.calls + 1
  returning calls into used;

  return used <= public.coach_daily_limit();
end;
$$;

-- Lets a signed-in student see how much budget is left today without being
-- able to change it.
create or replace function public.coach_quota_remaining()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    public.coach_daily_limit() - coalesce(
      (select calls from public.coach_usage
        where user_id = auth.uid()
          and day = (now() at time zone 'utc')::date),
      0
    )
  );
$$;


-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.coach_conversations enable row level security;
alter table public.coach_messages      enable row level security;
alter table public.coach_usage         enable row level security;

-- ------------------------------------------------------- conversations ----
drop policy if exists coach_conversations_own on public.coach_conversations;

-- Coaching transcripts are private to the student. Officers and Directors do
-- NOT get a read policy here — an admin tab that surfaced these would turn a
-- private advice channel into a monitored one.
create policy coach_conversations_own on public.coach_conversations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------ messages ----
drop policy if exists coach_messages_own on public.coach_messages;

create policy coach_messages_own on public.coach_messages
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --------------------------------------------------------------- usage ----
drop policy if exists coach_usage_select_own on public.coach_usage;

-- Read-only, and only your own row. No insert/update/delete policy exists,
-- so the counter is writable exclusively through coach_consume_quota().
create policy coach_usage_select_own on public.coach_usage
  for select to authenticated
  using (user_id = auth.uid());


-- ============================================================================
-- 4. GRANTS
-- ============================================================================
-- Postgres privileges are a separate layer from RLS: a policy can permit a row
-- while a missing GRANT still blocks the statement. (This is the same class of
-- problem as the earlier `permission denied for table profiles` error.)

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.coach_conversations to authenticated;
grant select, insert, update, delete on public.coach_messages      to authenticated;
grant select                        on public.coach_usage          to authenticated;

grant execute on function public.coach_consume_quota()   to authenticated;
grant execute on function public.coach_quota_remaining() to authenticated;
grant execute on function public.coach_daily_limit()     to authenticated;


-- ============================================================================
-- 5. CHECK IT WORKED
-- ============================================================================
--
--   select public.coach_quota_remaining();        -- should return 25
--   select public.coach_consume_quota();          -- true, and decrements
--   select * from public.coach_usage;             -- your row, calls = 1
--
-- To change the daily cap, edit coach_daily_limit() above and re-run the file.
-- ============================================================================
