-- 0009_rate_limit_and_role_lock.sql
--
-- Two related security hardening changes:
--   1. daily_plans.updated_at  - lets /api/plan throttle regenerate spam
--      against an authoritative server timestamp (previously the route used
--      only created_at, which doesn't tick on upsert).
--   2. profiles.role lock      - users could previously self-elevate to
--      'trainer' via a direct UPDATE on their profile from the browser.
--      RLS now blocks any role change on self-update; role transitions
--      must go through the request_trainer_role() RPC, which is the single
--      future-proof place to add real authorization logic (manual approval,
--      email allow-list, etc.) before WP2 alfa testing.

-- ============================================================================
-- 1. daily_plans.updated_at + touch trigger
-- ============================================================================

alter table public.daily_plans
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists daily_plans_touch_updated_at on public.daily_plans;
create trigger daily_plans_touch_updated_at
  before update on public.daily_plans
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 2. Lock profiles.role on self-update + provide RPC for legitimate transitions
-- ============================================================================

drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_update
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Role changes must go through request_trainer_role() RPC. Allow
    -- the value to stay the same (most self-updates touch other fields).
    and role = (select role from public.profiles where id = auth.uid())
  );

create or replace function public.request_trainer_role()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_role text;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select role into v_current_role from public.profiles where id = auth.uid();

  -- Idempotent: trainers calling this again get true without churning the row.
  if v_current_role = 'trainer' then
    return true;
  end if;

  -- Permissive transition for now: any authenticated participant can become a
  -- trainer. This is intentional during the WP1 prototype phase - the
  -- Erasmus consortium hasn't finalized who counts as a "trainer" yet.
  -- BEFORE WP2 ALFA (5 trainers PL + 5 IT), replace this body with a real
  -- authorization check (email allow-list, manual approval table, or
  -- consortium-issued invite codes).
  update public.profiles
     set role = 'trainer'
   where id = auth.uid();

  return true;
end;
$$;

revoke all on function public.request_trainer_role() from public;
grant execute on function public.request_trainer_role() to authenticated;

comment on function public.request_trainer_role() is
  'Single authorized path to elevate profiles.role to trainer. Currently '
  'permissive (any authenticated user). Replace body with a real auth check '
  'before WP2 alfa - see migration 0009 header for context.';
