-- 0025_goalkeeper_track.sql
--
-- Adds the goalkeeper track. A goalkeeper is a football player with a
-- dedicated plan focused on handling, diving, shot-stopping, footwork and
-- distribution rather than outfield dribbling/shooting.
--
--   profiles.is_goalkeeper - opt-in flag, set in onboarding/settings.
--   exercises.category = 'football_goalkeeper' - new category (rows only,
--     no schema change needed for the text column).

alter table public.profiles
  add column if not exists is_goalkeeper boolean not null default false;
