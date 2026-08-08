-- ============================================================================
-- PATCH: table grants
-- ============================================================================
--
-- Fixes: "permission denied for table profiles" on signup or login.
--
-- Row Level Security decides WHICH ROWS a caller may touch. It does not grant
-- access to the table itself. Without the grants below, a request is refused
-- at the table level before any policy is even evaluated.
--
-- Run this whole file once in the Supabase SQL editor. It is safe to re-run,
-- and it does not touch your data or your policies.
--
-- (If you'd rather just re-run the full supabase/schema.sql, that now contains
-- all of this too — you don't need both.)
-- ============================================================================

-- `authenticated` is the role Supabase runs a logged-in user's requests as.
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles           to authenticated;
grant select, insert, update, delete on public.academic_records   to authenticated;
grant select, insert, update, delete on public.transcripts        to authenticated;
grant select, insert, update, delete on public.extracurriculars   to authenticated;
grant select, insert, update, delete on public.goals              to authenticated;
grant select, insert, update, delete on public.guides_submissions to authenticated;
grant select, insert, update, delete on public.tasks              to authenticated;
grant select, insert, update, delete on public.volunteer_hours    to authenticated;

-- Append-only, matching its policies: no update, no delete.
grant select, insert on public.activity_log to authenticated;

-- Policies call these helpers as the caller, so the caller needs EXECUTE.
grant execute on function public.current_user_role()             to authenticated;
grant execute on function public.is_admin()                      to authenticated;
grant execute on function public.current_officer_category()      to authenticated;
grant execute on function public.role_at_least(public.user_role) to authenticated;
grant execute on function public.seed_admin_email()              to authenticated, supabase_auth_admin;

-- The signup trigger runs as supabase_auth_admin (the role that owns
-- auth.users). It needs to reach public.profiles to create the profile row.
grant usage on schema public to supabase_auth_admin;
grant insert, select on public.profiles to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Repair anyone who signed up while the grants were missing.
--
-- The auth.users row was created but the profile insert may have been rolled
-- back. This backfills a profile for any auth user missing one, and applies
-- the seed-admin rule to them.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, grade_level, interests, role)
select
  u.id,
  u.email,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'grade_level', '')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'interests', '')), ''),
  case
    when lower(u.email) = lower(public.seed_admin_email()) then 'admin'::public.user_role
    else 'member'::public.user_role
  end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Make sure the seed admin is a Director even if their profile already existed.
update public.profiles
set role = 'admin', officer_category = null
where lower(email) = lower(public.seed_admin_email())
  and role <> 'admin';

-- ---------------------------------------------------------------------------
-- Check the result. You should see one row per account, with your seed admin
-- address showing role = admin.
-- ---------------------------------------------------------------------------
select email, role, officer_category, created_at
from public.profiles
order by created_at;
