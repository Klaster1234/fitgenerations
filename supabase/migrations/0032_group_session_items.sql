-- 0032_group_session_items.sql
-- Coach-defined club training sessions attached to a group code. Append-only.
--
-- Why: a group code (migration 0007) so far only carried a name / city / sport
-- and drove the leaderboard + the AI-plan sport flag. Clubs that already run
-- their own microcycle want the app to show THEIR exact session under their
-- code, not an AI-generated plan. This table stores an ordered, fixed session
-- per group code, rendered on /group/[code]. It is independent of daily_plans
-- (the AI track) and of the groups row itself (keyed by code text), so a
-- session can be seeded before a trainer account creates the matching group.
--
-- First user: KP Nowy Sikornik Gliwice, code SIKORNIK (coach: Dariusz).

create table if not exists public.group_session_items (
  id uuid primary key default gen_random_uuid(),
  group_code text not null check (group_code ~ '^[A-Z0-9]{4,12}$'),
  position int not null check (position >= 0),
  -- i18n JSONB, same {en,pl,it,uk} shape as exercises.name
  name jsonb not null,
  duration_minutes int not null check (duration_minutes > 0),
  video_url text,
  note jsonb,
  created_at timestamptz not null default now(),
  unique (group_code, position)
);

alter table public.group_session_items enable row level security;

-- Read: any authenticated user (the app's anonymous sessions are authenticated
-- JWTs) can see a club session - same visibility model as exercises / groups.
-- No personal data is stored here.
create policy "group_session_items_authenticated_select"
  on public.group_session_items for select
  to authenticated
  using (true);

-- Write: only the trainer who owns the matching group may edit its session.
create policy "group_session_items_owner_write"
  on public.group_session_items for all
  to authenticated
  using (
    exists (
      select 1 from public.groups g
      where g.code = group_session_items.group_code
        and g.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      where g.code = group_session_items.group_code
        and g.owner_id = auth.uid()
    )
  );

create index if not exists group_session_items_code_idx
  on public.group_session_items(group_code);

-- ============================================================================
-- Seed: KP Nowy Sikornik (code SIKORNIK) - Thursday microcycle supplied by
-- coach Dariusz. Order and durations are his. Video links are matched
-- references: the 11+ clip is an injury-prevention programme; the rondo and
-- tournament clips reuse the app's own football catalogue; the warm-up is a
-- mini-band activation routine for footballers.
-- ============================================================================
insert into public.group_session_items (group_code, position, name, duration_minutes, video_url)
values
  ('SIKORNIK', 0,
   '{"en":"General mobility warm-up with mini bands","pl":"Rozgrzewka ogólnorozwojowa z gumami mini band","it":"Riscaldamento generale con mini band","uk":"Загальнорозвиваюча розминка з міні-гумами"}'::jsonb,
   10, 'https://www.youtube.com/watch?v=_U950s_AsUg'),
  ('SIKORNIK', 1,
   '{"en":"Possession rondo 5v2","pl":"Gra zadaniowa „dziadek” 5x2","it":"Torello 5 contro 2 (possesso)","uk":"Гра на утримання «дзядек» 5x2"}'::jsonb,
   5, 'https://www.youtube.com/watch?v=ESEjTbZxs90'),
  ('SIKORNIK', 2,
   '{"en":"Injury-prevention exercises","pl":"Ćwiczenia prewencji urazów","it":"Esercizi di prevenzione infortuni","uk":"Вправи для профілактики травм"}'::jsonb,
   4, 'https://www.youtube.com/watch?v=oCaarADKWRk'),
  ('SIKORNIK', 3,
   '{"en":"Football tournament","pl":"Turniej piłkarski","it":"Torneo di calcio","uk":"Футбольний турнір"}'::jsonb,
   65, 'https://www.youtube.com/watch?v=Y4Bcjp5q8m0')
on conflict (group_code, position) do nothing;
