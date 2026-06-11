-- In-app testing surveys. Append-only.
--
-- Context: organisational policy forbids external form tools (Google Forms
-- et al.) — all registration / data collection must run on our own systems.
-- These three surveys (baseline / final / trainer) mirror Annexes A–C of the
-- FGST national testing report template, so PL/IT data stays comparable.
--
-- Privacy: responses are anonymous by design. No user_id, no IP, no personal
-- columns — only the survey key, the UI locale and the answers JSON.
-- RLS: anyone may INSERT (anon + authenticated); nobody may SELECT through
-- the API. Partners watch response numbers via a SECURITY DEFINER counts
-- function that never exposes the answers themselves.

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey text not null check (survey in ('baseline', 'final', 'trainer')),
  locale text not null check (locale in ('en', 'pl', 'it', 'uk')),
  answers jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.survey_responses enable row level security;

drop policy if exists survey_responses_insert_all on public.survey_responses;
create policy survey_responses_insert_all
  on public.survey_responses for insert
  to anon, authenticated
  with check (true);

-- Aggregated counts only — never the answers.
create or replace function public.survey_counts()
returns table (survey text, locale text, responses bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.survey, s.locale, count(*)::bigint as responses
  from public.survey_responses s
  group by s.survey, s.locale
  order by s.survey, s.locale;
$$;

grant execute on function public.survey_counts() to anon, authenticated;
