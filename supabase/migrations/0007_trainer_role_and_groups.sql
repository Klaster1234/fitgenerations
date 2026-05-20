-- Trainer role + owned-groups schema. Append-only.
--
-- Adds:
--   1. profiles.role ('participant' | 'trainer'), default 'participant'.
--      Self-declared at signup or via Settings. Used to gate UI affordances:
--      trainers see the /trainer dashboard, the "Create group" button, and
--      owner actions on /group/[code].
--   2. groups table — a trainer-owned record per group. Codes were already
--      stored in profiles.group_code as free text; this table backs them
--      with a real owner so /group/[code] can attribute the group and the
--      RPC can return its display name + city.
--   3. Updated get_group_stats RPC: now also returns group_name + group_city
--      so the leaderboard page can show "Group POTENZA1 — Potenza" instead
--      of a bare code.

-- ============================================================================
-- 1. profiles.role
-- ============================================================================
alter table public.profiles
  add column if not exists role text not null default 'participant';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('participant', 'trainer'));

create index if not exists profiles_role_idx on public.profiles(role)
  where role = 'trainer';

-- ============================================================================
-- 2. groups table
-- ============================================================================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[A-Z0-9]{4,12}$'),
  name text not null check (length(name) between 1 and 80),
  city text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;

-- The trainer who owns the group can do everything on it (create / edit / delete).
create policy "groups_owner_all"
  on public.groups for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Any authenticated user can SELECT a group by code so the join flow + the
-- /group/[code] page can show its name to participants. No PII is exposed
-- (only code, name, city) - owner_id is not sensitive.
create policy "groups_authenticated_select"
  on public.groups for select
  to authenticated
  using (true);

create index if not exists groups_code_idx on public.groups(code);
create index if not exists groups_owner_idx on public.groups(owner_id);

create trigger groups_touch_updated_at
  before update on public.groups
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 3. Updated RPC — now returns group_name + group_city.
-- PostgreSQL refuses to alter an existing function's return type via
-- `create or replace`, so we drop and recreate.
-- ============================================================================
drop function if exists public.get_group_stats(text);

create or replace function public.get_group_stats(p_code text)
returns table (
  member_count integer,
  total_workouts bigint,
  active_today integer,
  group_name text,
  group_city text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    (select count(*)::int from public.profiles where group_code = p_code) as member_count,
    (select count(*)::bigint
       from public.activity_logs al
       join public.profiles p on p.id = al.user_id
       where p.group_code = p_code) as total_workouts,
    (select count(distinct p.id)::int
       from public.profiles p
       join public.activity_logs al on al.user_id = p.id
       where p.group_code = p_code
         and al.log_date = current_date) as active_today,
    (select g.name from public.groups g where g.code = p_code limit 1) as group_name,
    (select g.city from public.groups g where g.code = p_code limit 1) as group_city;
end;
$$;

grant execute on function public.get_group_stats(text) to authenticated, anon;
