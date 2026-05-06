-- FGST initial schema
-- Run via: supabase db push   (or paste in Supabase SQL editor for the project)
-- Conventions:
--   * RLS enabled on every user-data table.
--   * `auth.users` is owned by Supabase Auth — we extend it via `profiles`.
--   * Timestamps use `timestamptz`, defaults to now().

-- ============================================================================
-- profiles: extends auth.users with onboarding answers
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en' check (locale in ('en', 'pl', 'it')),
  display_name text,
  age int check (age between 6 and 120),
  fitness_level text check (fitness_level in ('low', 'mid', 'high')),
  equipment text[] not null default '{}',
  goals text[] not null default '{}',
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_self_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- exercises: shared catalog of exercises (read-only for users)
-- ============================================================================
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null check (category in (
    'warmup', 'functional', 'team', 'balance',
    'flexibility', 'cardio', 'mobility', 'cooldown'
  )),
  difficulty text not null check (difficulty in ('low', 'mid', 'high')),
  -- Translations stored as JSONB: { "en": "Push-ups", "pl": "Pompki", "it": "Flessioni" }
  name jsonb not null,
  description jsonb not null,
  video_url text,
  equipment text[] not null default '{}',
  duration_minutes int not null default 5 check (duration_minutes > 0),
  min_age int not null default 6,
  max_age int not null default 120,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "exercises_anyone_select"
  on public.exercises for select
  to authenticated
  using (true);

create index exercises_category_idx on public.exercises(category);
create index exercises_difficulty_idx on public.exercises(difficulty);

-- ============================================================================
-- daily_plans: AI-generated plans, one per user per date
-- ============================================================================
create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  weather jsonb,
  -- Array of { exercise_id, duration_minutes, order, ai_note }
  items jsonb not null default '[]',
  ai_summary text,
  ai_model text,
  created_at timestamptz not null default now(),
  unique(user_id, plan_date)
);

alter table public.daily_plans enable row level security;

create policy "daily_plans_self_all"
  on public.daily_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index daily_plans_user_date_idx on public.daily_plans(user_id, plan_date desc);

-- ============================================================================
-- activity_logs: user's record of completed exercises
-- ============================================================================
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.daily_plans(id) on delete set null,
  exercise_id uuid references public.exercises(id) on delete set null,
  log_date date not null default current_date,
  duration_minutes int,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create policy "activity_logs_self_all"
  on public.activity_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index activity_logs_user_date_idx on public.activity_logs(user_id, log_date desc);

-- ============================================================================
-- badges: shared catalog of motivational badges
-- ============================================================================
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name jsonb not null,
  description jsonb not null,
  icon text not null,
  -- Earn rule, e.g. { "type": "streak", "days": 7 }
  criteria jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy "badges_anyone_select"
  on public.badges for select
  to authenticated
  using (true);

-- ============================================================================
-- user_badges: which badges each user has earned
-- ============================================================================
create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "user_badges_self_select"
  on public.user_badges for select
  using (auth.uid() = user_id);

create policy "user_badges_self_insert"
  on public.user_badges for insert
  with check (auth.uid() = user_id);

-- ============================================================================
-- challenge_videos: user uploads for #SmartMoveChallenge
-- ============================================================================
create table public.challenge_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  caption text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.challenge_videos enable row level security;

create policy "challenge_videos_owner_all"
  on public.challenge_videos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "challenge_videos_public_select"
  on public.challenge_videos for select
  to authenticated
  using (is_public = true);

-- ============================================================================
-- updated_at trigger (reusable)
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
