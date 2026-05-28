-- 0012_anon_browse_exercises.sql
--
-- Allow anonymous (logged-out) users to SELECT from public.exercises so the
-- /football Skills Library can demonstrate value before signup. The existing
-- policy from migration 0001 only granted SELECT to 'authenticated'; this
-- adds an explicit policy for 'anon'.
--
-- Exercises are public catalogue data with no PII. This is intentional per
-- docs/specs/2026-05-28-football-track-design.md section 6.4 ("dostępna dla
-- wszystkich nawet anonim").

drop policy if exists exercises_anon_select on public.exercises;

create policy exercises_anon_select
  on public.exercises
  for select
  to anon
  using (true);
