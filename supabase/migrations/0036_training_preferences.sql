-- 0036_training_preferences.sql
-- Feature requested by trainer Mateusz Czub during the alpha tests (KP/16-senior
-- group): let users type their own free-text notes / preferences so the AI can
-- tailor the daily plan to individual needs (an injury to spare, exercises they
-- like or dislike, what to focus on, how much time they have).
--
-- Stored as nullable free text on profiles, capped at 500 chars so it stays a
-- short note (and bounds the tokens we add to the Groq user message). The plan
-- generator reads it from the profile and passes it in the per-request user
-- payload; the stable system prompt instructs the model to honor it without
-- ever overriding the age/equipment/weather safety rules.
alter table public.profiles
  add column if not exists training_preferences text;

alter table public.profiles drop constraint if exists profiles_training_preferences_len;
alter table public.profiles add constraint profiles_training_preferences_len
  check (training_preferences is null or char_length(training_preferences) <= 500);
