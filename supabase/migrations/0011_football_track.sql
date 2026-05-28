-- 0011_football_track.sql
--
-- Adds football-track capability:
--   1. profiles.interests   - array of sport interests, opt-in
--   2. groups.sport         - sport metadata for group-driven auto-flag
--   3. exercises coaching   - why_matters / key_focus / pro_tip (JSONB, multi-locale,
--                             nullable, only football exercises populate them at first)
--   4. sync_interests_from_group trigger - when a user joins a football
--      group via group_code, auto-add 'football' to their interests

-- ============================================================================
-- 1. profiles.interests
-- ============================================================================
alter table public.profiles
  add column if not exists interests text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_interests_valid;

alter table public.profiles
  add constraint profiles_interests_valid
  check (interests <@ array['football','fitness','green']::text[]);

-- ============================================================================
-- 2. groups.sport
-- ============================================================================
alter table public.groups
  add column if not exists sport text not null default 'general';

alter table public.groups
  drop constraint if exists groups_sport_valid;

alter table public.groups
  add constraint groups_sport_valid
  check (sport in ('general','football'));

-- ============================================================================
-- 3. exercises coaching fields (JSONB for multi-locale, nullable - only
--    football populates them initially). JSONB shape mirrors the pattern
--    already used for exercises.name and .description:
--      why_matters: {"en": "...", "pl": "...", "it": "...", "uk": "..."}
--      key_focus:   {"en": ["...","..."], "pl": [...], "it": [...], "uk": [...]}
--      pro_tip:     {"en": "...", "pl": "...", "it": "...", "uk": "..."}
-- ============================================================================
alter table public.exercises
  add column if not exists why_matters jsonb,
  add column if not exists key_focus jsonb,
  add column if not exists pro_tip jsonb;

-- ============================================================================
-- 4. Trigger: when user updates their group_code, if the referenced group
--    has sport='football', auto-add 'football' to their interests.
--    Subtractive removal NOT done - users may have football interest
--    independently of group membership.
-- ============================================================================
create or replace function public.sync_interests_from_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sport text;
begin
  if NEW.group_code is null then
    return NEW;
  end if;
  if OLD is not null and NEW.group_code is not distinct from OLD.group_code then
    return NEW;
  end if;

  select sport into v_sport
    from public.groups
   where code = NEW.group_code;

  if v_sport = 'football' and not ('football' = any(NEW.interests)) then
    NEW.interests := NEW.interests || array['football']::text[];
  end if;

  return NEW;
end;
$$;

drop trigger if exists profiles_sync_interests on public.profiles;
create trigger profiles_sync_interests
  before insert or update of group_code on public.profiles
  for each row execute function public.sync_interests_from_group();
