-- Schema additions driven by the 5-persona audit. Append-only.
--
-- 1. Allow 'uk' as a valid profile locale (next-intl routes /uk already exist,
--    but the original schema check rejected the insert, which silently
--    forced Ukrainian users back to 'en').
-- 2. Add `trains_with_partner` for the intergenerational pair-training flow
--    (RDZEŃ projektu: grandparent + grandchild).
-- 3. Add `group_code` so trainers can run Move & Improve Days sessions —
--    every participant enters the same code, and the /group/[code] page
--    aggregates progress.
-- 4. Add `country` to challenge_videos so the feed can be sliced PL/IT/EU.
-- 5. Public RPC `get_group_stats(code)` exposes per-group leaderboard data
--    without breaking the per-row RLS policy on profiles.

-- ============================================================================
-- 1. Locale check: include 'uk' (Ukrainian, for refugees)
-- ============================================================================
alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles add constraint profiles_locale_check
  check (locale in ('en', 'pl', 'it', 'uk'));

-- ============================================================================
-- 2. trains_with_partner
-- ============================================================================
alter table public.profiles
  add column if not exists trains_with_partner boolean not null default false;

-- ============================================================================
-- 3. group_code (6-char alphanumeric, uppercased)
-- ============================================================================
alter table public.profiles
  add column if not exists group_code text;

alter table public.profiles drop constraint if exists profiles_group_code_format;
alter table public.profiles add constraint profiles_group_code_format
  check (group_code is null or group_code ~ '^[A-Z0-9]{4,12}$');

create index if not exists profiles_group_code_idx on public.profiles(group_code)
  where group_code is not null;

-- ============================================================================
-- 4. challenge_videos.country (ISO-style: 'pl', 'it', 'eu', 'other')
-- ============================================================================
alter table public.challenge_videos
  add column if not exists country text;

alter table public.challenge_videos drop constraint if exists challenge_videos_country_check;
alter table public.challenge_videos add constraint challenge_videos_country_check
  check (country is null or country in ('pl', 'it', 'eu', 'other', 'uk'));

create index if not exists challenge_videos_country_idx on public.challenge_videos(country)
  where country is not null;

-- ============================================================================
-- 5. get_group_stats RPC — returns per-group aggregates without leaking PII
-- ============================================================================
-- Safe to expose: counts members, sums activity logs, returns max streak.
-- Profiles' RLS still hides individual rows; this function runs with
-- elevated privileges (`security definer`) but ONLY returns aggregates.
create or replace function public.get_group_stats(p_code text)
returns table (
  member_count integer,
  total_workouts bigint,
  active_today integer
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
         and al.log_date = current_date) as active_today;
end;
$$;

grant execute on function public.get_group_stats(text) to authenticated, anon;

-- ============================================================================
-- 6. Swap the 'three-on-three' video to a walking-football demo so seniors
--    in Move & Improve Days don't see an advanced transition drill (audit P1).
-- ============================================================================
update public.exercises
set video_url = 'https://www.youtube.com/watch?v=02ypDc--VFg'
where slug = 'three-on-three';
