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
-- Seed initial exercise catalog (small starter set — extend over time).
-- Names/descriptions in EN/PL/IT.

insert into public.exercises (slug, category, difficulty, name, description, video_url, equipment, duration_minutes, min_age, max_age) values
  -- Warmup
  ('arm-circles', 'warmup', 'low',
    '{"en": "Arm circles", "pl": "Krążenia ramion", "it": "Circonduzioni delle braccia"}',
    '{"en": "Stand tall, extend arms, draw small to large circles for 30s each direction.", "pl": "Stań prosto, wyprostuj ramiona, wykonuj małe i duże krążenia po 30s w każdą stronę.", "it": "In piedi, braccia tese, fai cerchi piccoli e poi grandi per 30s in ogni direzione."}',
    'https://www.youtube.com/watch?v=140RTNMciH8',
    '{}', 3, 6, 120),

  ('marching-in-place', 'warmup', 'low',
    '{"en": "Marching in place", "pl": "Marsz w miejscu", "it": "Marcia sul posto"}',
    '{"en": "Lift knees gently, swing arms naturally for 1 minute.", "pl": "Unoś kolana łagodnie, naturalnie kołysz ramionami przez minutę.", "it": "Alza le ginocchia delicatamente, oscilla le braccia naturalmente per un minuto."}',
    null,
    '{}', 3, 6, 120),

  -- Functional
  ('chair-sit-to-stand', 'functional', 'low',
    '{"en": "Chair sit-to-stand", "pl": "Wstawanie z krzesła", "it": "Alzarsi dalla sedia"}',
    '{"en": "Sit on a sturdy chair, stand without using hands, sit back down. 8-12 reps.", "pl": "Usiądź na stabilnym krześle, wstań bez pomocy rąk, usiądź. 8-12 powtórzeń.", "it": "Siediti su una sedia stabile, alzati senza usare le mani, risiedi. 8-12 ripetizioni."}',
    null,
    '{}', 5, 6, 120),

  ('bodyweight-squat', 'functional', 'mid',
    '{"en": "Bodyweight squat", "pl": "Przysiad", "it": "Squat a corpo libero"}',
    '{"en": "Feet shoulder-width, sit hips back, knees over toes. 10-15 reps.", "pl": "Stopy na szerokość barków, biodra w tył, kolana nad palcami. 10-15 powtórzeń.", "it": "Piedi alla larghezza delle spalle, fianchi indietro, ginocchia sopra le dita. 10-15 ripetizioni."}',
    'https://www.youtube.com/watch?v=YaXPRqUwItQ',
    '{}', 6, 12, 100),

  ('wall-pushup', 'functional', 'low',
    '{"en": "Wall push-up", "pl": "Pompki o ścianę", "it": "Flessioni al muro"}',
    '{"en": "Stand arm''s length from wall, palms on wall, lower chest, push back. 10-12 reps.", "pl": "Stań na długość ręki od ściany, dłonie na ścianie, opuść klatkę, odepchnij. 10-12 powtórzeń.", "it": "Stai a un braccio dal muro, palmi al muro, abbassa il petto, spingi. 10-12 ripetizioni."}',
    null,
    '{}', 5, 6, 120),

  -- Balance
  ('single-leg-stand', 'balance', 'low',
    '{"en": "Single-leg stand", "pl": "Stanie na jednej nodze", "it": "Equilibrio su una gamba"}',
    '{"en": "Stand near a wall for safety, lift one foot, hold 20-30s. Switch sides.", "pl": "Stań przy ścianie dla bezpieczeństwa, unieś stopę, trzymaj 20-30s. Zmień stronę.", "it": "Stai vicino a un muro per sicurezza, solleva un piede, tieni 20-30s. Cambia lato."}',
    null,
    '{}', 4, 6, 120),

  -- Flexibility
  ('seated-forward-fold', 'flexibility', 'low',
    '{"en": "Seated forward fold", "pl": "Skłon w siadzie", "it": "Piegamento in avanti seduto"}',
    '{"en": "Sit with legs forward, gently reach toward feet. Hold 30s, breathe.", "pl": "Usiądź z nogami przed sobą, delikatnie sięgnij do stóp. Trzymaj 30s, oddychaj.", "it": "Siediti con le gambe in avanti, raggiungi delicatamente i piedi. Tieni 30s, respira."}',
    null,
    '{"mat"}', 4, 6, 120),

  -- Cardio
  ('brisk-walk', 'cardio', 'low',
    '{"en": "Brisk walk", "pl": "Szybki marsz", "it": "Camminata veloce"}',
    '{"en": "Walk at a pace where you can talk but not sing. 10-20 minutes.", "pl": "Maszeruj w tempie, w którym możesz mówić, ale nie śpiewać. 10-20 minut.", "it": "Cammina a un ritmo in cui puoi parlare ma non cantare. 10-20 minuti."}',
    null,
    '{"park"}', 15, 6, 120),

  -- Cooldown
  ('deep-breathing', 'cooldown', 'low',
    '{"en": "Deep breathing", "pl": "Głębokie oddechy", "it": "Respirazione profonda"}',
    '{"en": "Sit comfortably, inhale 4 counts, hold 4, exhale 6. Repeat for 2 minutes.", "pl": "Usiądź wygodnie, wdech 4 sekundy, zatrzymaj 4, wydech 6. Powtarzaj 2 minuty.", "it": "Siediti comodo, inspira 4 secondi, trattieni 4, espira 6. Ripeti per 2 minuti."}',
    null,
    '{}', 2, 6, 120);
-- Extend exercise categories to cover Erasmus+ scope:
-- + 'green' (Nordic walking, tai-chi, plogging, frisbee — green sports per proposal)
-- + 'pair' (intergenerational pair training — Move & Improve / Olympics)
-- + 'team' (already in schema, seed empty)

alter table public.exercises drop constraint exercises_category_check;
alter table public.exercises add constraint exercises_category_check
  check (category in (
    'warmup', 'functional', 'team', 'balance',
    'flexibility', 'cardio', 'mobility', 'cooldown',
    'green', 'pair'
  ));

insert into public.exercises (slug, category, difficulty, name, description, video_url, equipment, duration_minutes, min_age, max_age) values
  -- Warmup additions
  ('shoulder-rolls', 'warmup', 'low',
    '{"en": "Shoulder rolls", "pl": "Krążenia barków", "it": "Rotazioni delle spalle"}',
    '{"en": "Roll shoulders backward 10x, then forward 10x. Slow and gentle.", "pl": "Wykonaj 10 krążeń barkami w tył, potem 10 w przód. Powoli i delikatnie.", "it": "Ruota le spalle indietro 10 volte, poi avanti 10 volte. Lento e delicato."}',
    null, '{}', 2, 6, 120),

  ('hip-circles', 'warmup', 'low',
    '{"en": "Hip circles", "pl": "Krążenia bioder", "it": "Cerchi con i fianchi"}',
    '{"en": "Hands on hips, gently circle hips clockwise 10x, counter-clockwise 10x.", "pl": "Ręce na biodrach, delikatnie krąż biodrami w prawo 10x, w lewo 10x.", "it": "Mani sui fianchi, fai cerchi con i fianchi a destra 10 volte, a sinistra 10 volte."}',
    null, '{}', 2, 6, 120),

  -- Functional additions
  ('plank-knee', 'functional', 'mid',
    '{"en": "Plank on knees", "pl": "Deska na kolanach", "it": "Plank sulle ginocchia"}',
    '{"en": "Forearms on mat, knees down, body straight from head to knees. Hold 20-40 seconds.", "pl": "Przedramiona na macie, kolana na podłodze, ciało proste od głowy do kolan. Trzymaj 20-40 sekund.", "it": "Avambracci sul tappetino, ginocchia a terra, corpo dritto dalla testa alle ginocchia. Tieni 20-40 secondi."}',
    'https://www.youtube.com/watch?v=ASdvN_XEl_c', '{"mat"}', 4, 12, 90),

  ('lunge', 'functional', 'mid',
    '{"en": "Stationary lunges", "pl": "Wykroki w miejscu", "it": "Affondi sul posto"}',
    '{"en": "Step forward, lower back knee toward floor, push back up. 8 each leg.", "pl": "Wykrok w przód, opuść tylne kolano w stronę podłogi, wróć. 8 powtórzeń na nogę.", "it": "Passo in avanti, abbassa il ginocchio posteriore verso il pavimento, torna su. 8 per gamba."}',
    null, '{}', 5, 12, 90),

  ('glute-bridge', 'functional', 'low',
    '{"en": "Glute bridge", "pl": "Mostek pośladkowy", "it": "Ponte glutei"}',
    '{"en": "Lie on back, knees bent. Lift hips, squeeze glutes, lower. 12-15 reps.", "pl": "Połóż się na plecach, kolana zgięte. Unieś biodra, napnij pośladki, opuść. 12-15 powt.", "it": "Sdraiati sulla schiena, ginocchia piegate. Solleva i fianchi, contrai i glutei, abbassa. 12-15 ripetizioni."}',
    null, '{"mat"}', 5, 10, 100),

  ('row-band', 'functional', 'mid',
    '{"en": "Resistance band row", "pl": "Wiosłowanie z gumą", "it": "Remata con elastico"}',
    '{"en": "Anchor band, pull elbows back, squeeze shoulder blades. 12 reps.", "pl": "Zakotwicz gumę, ciągnij łokcie do tyłu, ściskając łopatki. 12 powtórzeń.", "it": "Ancora l''elastico, tira i gomiti indietro, stringi le scapole. 12 ripetizioni."}',
    null, '{"bands"}', 5, 12, 90),

  -- Balance additions
  ('heel-to-toe-walk', 'balance', 'low',
    '{"en": "Heel-to-toe walk", "pl": "Marsz piętą do palców", "it": "Camminata tallone-punta"}',
    '{"en": "Walk in straight line, placing heel directly in front of opposite toe. 10 steps each direction.", "pl": "Idź po linii prostej, kładąc piętę tuż przed palcami drugiej stopy. 10 kroków w każdą stronę.", "it": "Cammina in linea retta, mettendo il tallone davanti alle dita dell''altro piede. 10 passi per direzione."}',
    null, '{}', 4, 6, 120),

  ('tree-pose', 'balance', 'mid',
    '{"en": "Tree pose", "pl": "Pozycja drzewa", "it": "Posizione dell''albero"}',
    '{"en": "Stand on one leg, place opposite foot on inner calf or thigh, hands at heart. Hold 30s. Switch.", "pl": "Stań na jednej nodze, drugą stopę oprzyj o łydkę lub udo, ręce złożone. Trzymaj 30s. Zmień stronę.", "it": "Stai su una gamba, metti l''altro piede sul polpaccio o coscia, mani al cuore. Tieni 30s. Cambia."}',
    null, '{}', 4, 8, 100),

  -- Flexibility / Yoga / Pilates additions
  ('yoga-childs-pose', 'flexibility', 'low',
    '{"en": "Yoga - Child''s pose", "pl": "Joga - pozycja dziecka", "it": "Yoga - Posizione del bambino"}',
    '{"en": "Kneel, sit on heels, fold forward, arms extended or by sides. Breathe deep. 1-2 min.", "pl": "Uklęknij, usiądź na piętach, pochyl się w przód, ręce wyciągnięte lub przy bokach. Oddychaj. 1-2 min.", "it": "Inginocchiati, siediti sui talloni, piegati in avanti, braccia tese o lungo i fianchi. Respira. 1-2 min."}',
    'https://www.youtube.com/watch?v=2MJGg-dUKh0', '{"mat"}', 3, 8, 120),

  ('yoga-cat-cow', 'flexibility', 'low',
    '{"en": "Cat-cow stretch", "pl": "Koci grzbiet", "it": "Stretching gatto-mucca"}',
    '{"en": "On hands and knees. Inhale: arch back, look up. Exhale: round back, chin to chest. 8-10 cycles.", "pl": "Na czworakach. Wdech: wygnij plecy, spójrz w górę. Wydech: zaokrąglij plecy, broda do klatki. 8-10 cykli.", "it": "A quattro zampe. Inspira: inarca la schiena, guarda in su. Espira: arrotonda la schiena, mento al petto. 8-10 cicli."}',
    null, '{"mat"}', 3, 8, 120),

  ('pilates-hundred', 'flexibility', 'mid',
    '{"en": "Pilates hundred", "pl": "Pilates - sto", "it": "Pilates - cento"}',
    '{"en": "Lie on back, lift legs to tabletop, head and shoulders up. Pump arms 100x while breathing rhythmically.", "pl": "Połóż się na plecach, unieś nogi pod kątem prostym, głowa i barki w górze. Pulsuj ramionami 100x, oddychając rytmicznie.", "it": "Sdraiati, solleva le gambe ad angolo retto, testa e spalle su. Pulsa le braccia 100 volte respirando ritmicamente."}',
    'https://www.youtube.com/watch?v=R8-HyJfNhsM', '{"mat"}', 5, 14, 80),

  -- Cardio additions
  ('jumping-jacks', 'cardio', 'mid',
    '{"en": "Jumping jacks", "pl": "Pajacyki", "it": "Jumping jacks"}',
    '{"en": "Jump while spreading legs and raising arms overhead, return. 30-60 seconds.", "pl": "Skacz rozkładając nogi i unosząc ręce nad głowę, wracaj. 30-60 sekund.", "it": "Salta allargando le gambe e alzando le braccia, torna. 30-60 secondi."}',
    null, '{}', 3, 8, 70),

  ('step-ups', 'cardio', 'low',
    '{"en": "Step-ups", "pl": "Wchodzenie na stopień", "it": "Salita sul gradino"}',
    '{"en": "Step up onto sturdy step or bench, alternate legs. 1-2 minutes at moderate pace.", "pl": "Wchodź na stabilny stopień lub ławeczkę, naprzemiennie nogi. 1-2 minuty w umiarkowanym tempie.", "it": "Sali su uno scalino stabile, alternando le gambe. 1-2 minuti a ritmo moderato."}',
    null, '{}', 5, 8, 90),

  -- Mobility additions
  ('neck-stretches', 'mobility', 'low',
    '{"en": "Neck stretches", "pl": "Rozciąganie szyi", "it": "Stretching del collo"}',
    '{"en": "Slowly tilt head to each side, then forward and back. Hold each 15s. Never force.", "pl": "Powoli przechylaj głowę na boki, potem w przód i tył. Trzymaj każdą pozycję 15s. Nigdy na siłę.", "it": "Inclina lentamente la testa ai lati, poi avanti e indietro. Tieni 15s ciascuna. Mai forzare."}',
    null, '{}', 3, 6, 120),

  ('thoracic-rotation', 'mobility', 'low',
    '{"en": "Seated spine rotation", "pl": "Rotacja kręgosłupa siedząc", "it": "Rotazione della colonna seduto"}',
    '{"en": "Sit tall, hands on shoulders, rotate left then right. 10 each side.", "pl": "Usiądź prosto, ręce na barkach, obróć tułów w lewo, potem w prawo. 10 razy na stronę.", "it": "Siedi dritto, mani sulle spalle, ruota a sinistra poi a destra. 10 per lato."}',
    null, '{}', 3, 8, 120),

  -- Cooldown additions
  ('forward-fold-stand', 'cooldown', 'low',
    '{"en": "Standing forward fold", "pl": "Skłon stojąc", "it": "Piegamento in piedi"}',
    '{"en": "Stand, fold forward at hips, let head and arms hang. Slight knee bend OK. 30-60s.", "pl": "Stań, pochyl się w przód od bioder, niech głowa i ręce zwisają. Lekko ugięte kolana. 30-60s.", "it": "In piedi, piegati in avanti dai fianchi, lascia testa e braccia pendere. Ginocchia leggermente piegate. 30-60s."}',
    null, '{}', 3, 10, 100),

  ('hamstring-stretch', 'cooldown', 'low',
    '{"en": "Hamstring stretch", "pl": "Rozciąganie dwugłowych", "it": "Stretching ischiocrurali"}',
    '{"en": "Sit, one leg straight, fold toward toes. Hold 30s. Switch.", "pl": "Usiądź, jedna noga prosto, sięgnij do palców. Trzymaj 30s. Zmień.", "it": "Siediti, una gamba dritta, piegati verso le dita. Tieni 30s. Cambia."}',
    null, '{"mat"}', 4, 8, 120),

  -- Green sports (eco-trening, zielony sport per wniosku)
  ('nordic-walking', 'green', 'low',
    '{"en": "Nordic walking", "pl": "Nordic walking", "it": "Nordic walking"}',
    '{"en": "Brisk walk with poles, push back firmly with each step. 20-30 minutes outdoors.", "pl": "Szybki marsz z kijkami, mocno odpychaj się przy każdym kroku. 20-30 minut na zewnątrz.", "it": "Camminata veloce con i bastoncini, spingi indietro con ogni passo. 20-30 minuti all''aperto."}',
    'https://www.youtube.com/watch?v=ZDuJ50T-a-w', '{"park"}', 25, 10, 120),

  ('tai-chi-basics', 'green', 'low',
    '{"en": "Tai chi - basic moves", "pl": "Tai-chi - podstawowe ruchy", "it": "Tai chi - movimenti base"}',
    '{"en": "Slow, flowing movements with deep breathing. Follow a beginner sequence. 10-15 minutes.", "pl": "Powolne, płynne ruchy z głębokim oddechem. Wykonaj sekwencję dla początkujących. 10-15 minut.", "it": "Movimenti lenti e fluidi con respirazione profonda. Segui una sequenza per principianti. 10-15 minuti."}',
    'https://www.youtube.com/watch?v=cEOS2zoyQw4', '{}', 12, 8, 120),

  ('plogging', 'green', 'mid',
    '{"en": "Plogging (jog + cleanup)", "pl": "Plogging (bieg + sprzątanie)", "it": "Plogging (corsa + pulizia)"}',
    '{"en": "Jog or walk outdoors, pick up litter as you go. Squat each time you pick up = bonus exercise. 20-30 min.", "pl": "Biegnij lub maszeruj na zewnątrz, zbieraj śmieci po drodze. Każdy przysiad to bonus. 20-30 min.", "it": "Corri o cammina all''aperto, raccogli rifiuti. Ogni squat è un esercizio bonus. 20-30 min."}',
    null, '{"park"}', 25, 10, 75),

  ('outdoor-frisbee', 'green', 'mid',
    '{"en": "Frisbee throwing", "pl": "Rzucanie frisbee", "it": "Lancio del frisbee"}',
    '{"en": "Find a partner. Practice throws and catches in a park. 15-20 minutes.", "pl": "Znajdź partnera. Ćwicz rzuty i łapanie w parku. 15-20 minut.", "it": "Trova un compagno. Pratica lanci e prese al parco. 15-20 minuti."}',
    null, '{"park"}', 18, 8, 80),

  ('eco-walk', 'green', 'low',
    '{"en": "Mindful eco-walk", "pl": "Eko-spacer uważności", "it": "Eco-camminata consapevole"}',
    '{"en": "Walk slowly outdoors. Notice 5 things you see, 4 you hear, 3 you can touch. Calming + active.", "pl": "Spaceruj powoli na zewnątrz. Zauważ 5 rzeczy które widzisz, 4 słyszysz, 3 możesz dotknąć. Wyciszenie + ruch.", "it": "Cammina lentamente all''aperto. Nota 5 cose che vedi, 4 che senti, 3 che puoi toccare. Calmante + attivo."}',
    null, '{"park"}', 15, 6, 120),

  -- Team games (Move & Improve / Olympics — proposal explicitly lists)
  ('petanque-practice', 'team', 'low',
    '{"en": "Petanque practice", "pl": "Petanka - ćwiczenie", "it": "Pratica di petanque"}',
    '{"en": "Throw boules toward target ball. Aim for accuracy. Play 3-4 rounds. Great intergenerational game.", "pl": "Rzucaj kulami do kulki celu. Trafność > siła. Zagraj 3-4 rundy. Świetna gra międzypokoleniowa.", "it": "Lancia le bocce verso il pallino. Mira alla precisione. Gioca 3-4 round. Ottimo gioco intergenerazionale."}',
    null, '{}', 20, 8, 120),

  ('target-throwing', 'team', 'low',
    '{"en": "Target throwing", "pl": "Rzuty do celu", "it": "Lancio al bersaglio"}',
    '{"en": "Set up a target (cone, basket). Take turns throwing balls/beanbags. Track points. 15-20 min.", "pl": "Ustaw cel (pachołek, koszyk). Na zmianę rzucajcie piłki/woreczki. Liczcie punkty. 15-20 min.", "it": "Imposta un bersaglio (cono, cestino). A turno lanciate palle/sacchetti. Tieni i punti. 15-20 min."}',
    null, '{}', 18, 6, 120),

  ('mini-relay', 'team', 'mid',
    '{"en": "Group relay", "pl": "Sztafeta grupowa", "it": "Staffetta di gruppo"}',
    '{"en": "Form 2 teams. Run 20m and back, pass baton (or hand). Encourage all paces. 4-6 rounds.", "pl": "Utwórzcie 2 drużyny. Biegnij 20m i z powrotem, przekaż pałeczkę (lub rękę). Każde tempo OK. 4-6 rund.", "it": "Forma 2 squadre. Corri 20m e ritorno, passa il testimone (o la mano). Ogni ritmo va bene. 4-6 round."}',
    null, '{"park"}', 15, 6, 90),

  ('three-on-three', 'team', 'high',
    '{"en": "3x3 mini-football", "pl": "Mini-piłka 3x3", "it": "Calcetto 3v3"}',
    '{"en": "Small-sided football, 3 vs 3, smaller goals. Focus on passing. 10-15 minute halves.", "pl": "Piłka nożna 3 na 3, mniejsze bramki. Skup się na podaniach. Połowy 10-15 minut.", "it": "Calcio 3 contro 3, porte più piccole. Concentrati sui passaggi. Tempi di 10-15 minuti."}',
    null, '{"park"}', 25, 12, 60),

  -- Pair / intergenerational (RDZEŃ projektu)
  ('pair-mirror', 'pair', 'low',
    '{"en": "Mirror moves (in pairs)", "pl": "Ruchy w lustrze (w parach)", "it": "Movimenti specchio (in coppia)"}',
    '{"en": "Stand facing partner. One leads slow movements, the other mirrors. Switch leader after 1 min. Great for grandparent + grandchild.", "pl": "Stańcie naprzeciwko siebie. Jedna osoba prowadzi powolne ruchy, druga naśladuje. Zmieniajcie się po 1 min. Idealne dla dziadek/babcia + wnuk.", "it": "In piedi di fronte al partner. Uno guida movimenti lenti, l''altro li specchia. Cambia leader dopo 1 min. Ottimo per nonno/a + nipote."}',
    null, '{}', 6, 6, 120),

  ('pair-toss', 'pair', 'low',
    '{"en": "Partner ball toss", "pl": "Podawanie piłki w parach", "it": "Lancio palla in coppia"}',
    '{"en": "Pass ball back and forth: high, low, with bounce. Adapt distance to abilities. 10 minutes.", "pl": "Podawajcie sobie piłkę: wysoko, nisko, z odbiciem. Dostosujcie odległość. 10 minut.", "it": "Passatevi la palla: alto, basso, con rimbalzo. Adatta la distanza. 10 minuti."}',
    null, '{}', 10, 6, 120),

  ('pair-balance-hold', 'pair', 'mid',
    '{"en": "Partner balance support", "pl": "Wsparcie równowagi w parach", "it": "Equilibrio in coppia"}',
    '{"en": "Both stand on one leg, hold each other''s opposite hand for balance. Hold 30s, switch sides.", "pl": "Oboje stańcie na jednej nodze, trzymajcie się za przeciwną rękę dla równowagi. 30s, zmień stronę.", "it": "Entrambi su una gamba, tenetevi per la mano opposta per equilibrio. 30s, cambiate lato."}',
    null, '{}', 5, 8, 120),

  ('pair-stretch-back', 'pair', 'low',
    '{"en": "Back-to-back stretch (in pairs)", "pl": "Rozciąganie plecami w parach", "it": "Stretching schiena-schiena"}',
    '{"en": "Sit back-to-back, link arms. One folds forward (gentle), the other leans back. Switch after 30s.", "pl": "Usiądźcie plecami, splećcie ramiona. Jedna osoba pochyla się w przód, druga odchyla. Zmieńcie po 30s.", "it": "Sedetevi schiena contro schiena, intrecciate le braccia. Uno si piega in avanti, l''altro indietro. Cambiate dopo 30s."}',
    null, '{"mat"}', 4, 10, 100);
-- Motivational badges (proposal: "motivational mechanisms").
-- Earning logic lives in the markExerciseDone Server Action.

insert into public.badges (slug, name, description, icon, criteria) values
  ('first-step',
    '{"en": "First step", "pl": "Pierwszy krok", "it": "Primo passo", "uk": "Перший крок"}',
    '{"en": "Complete your first exercise", "pl": "Wykonaj swoje pierwsze ćwiczenie", "it": "Completa il tuo primo esercizio", "uk": "Виконайте першу вправу"}',
    '🌱',
    '{"type": "logs_count", "min": 1}'),

  ('streak-3',
    '{"en": "3-day streak", "pl": "Seria 3 dni", "it": "Striscia di 3 giorni", "uk": "Серія 3 днів"}',
    '{"en": "Train 3 days in a row", "pl": "Trenuj 3 dni z rzędu", "it": "Allenati 3 giorni di fila", "uk": "Тренуйтеся 3 дні поспіль"}',
    '🔥',
    '{"type": "streak", "min": 3}'),

  ('streak-7',
    '{"en": "Week warrior", "pl": "Wojownik tygodnia", "it": "Guerriero della settimana", "uk": "Воїн тижня"}',
    '{"en": "Train 7 days in a row", "pl": "Trenuj 7 dni z rzędu", "it": "Allenati 7 giorni di fila", "uk": "Тренуйтеся 7 днів поспіль"}',
    '⭐',
    '{"type": "streak", "min": 7}'),

  ('streak-30',
    '{"en": "Month of motion", "pl": "Miesiąc w ruchu", "it": "Mese in movimento", "uk": "Місяць руху"}',
    '{"en": "Train 30 days in a row", "pl": "Trenuj 30 dni z rzędu", "it": "Allenati 30 giorni di fila", "uk": "Тренуйтеся 30 днів поспіль"}',
    '🏆',
    '{"type": "streak", "min": 30}'),

  ('ten-workouts',
    '{"en": "Ten and counting", "pl": "Dziesiątka", "it": "Decina", "uk": "Десятка"}',
    '{"en": "Complete 10 workouts in total", "pl": "Wykonaj łącznie 10 treningów", "it": "Completa 10 allenamenti in totale", "uk": "Виконайте 10 тренувань загалом"}',
    '💪',
    '{"type": "logs_count", "min": 10}'),

  ('diverse-five',
    '{"en": "Renaissance trainee", "pl": "Wszechstronny", "it": "Versatile", "uk": "Універсальний"}',
    '{"en": "Try 5 different exercise categories", "pl": "Wypróbuj 5 różnych kategorii ćwiczeń", "it": "Prova 5 diverse categorie di esercizi", "uk": "Спробуйте 5 різних категорій вправ"}',
    '🎨',
    '{"type": "diverse_categories", "min": 5}'),

  ('intergenerational',
    '{"en": "Bridge of generations", "pl": "Most pokoleń", "it": "Ponte delle generazioni", "uk": "Міст поколінь"}',
    '{"en": "Complete a pair / intergenerational exercise", "pl": "Wykonaj ćwiczenie w parze / międzypokoleniowe", "it": "Completa un esercizio in coppia / intergenerazionale", "uk": "Виконайте парну / міжпоколіннєву вправу"}',
    '🤝',
    '{"type": "category", "category": "pair"}'),

  ('green-mover',
    '{"en": "Green mover", "pl": "Eko-aktywny", "it": "Eco-attivo", "uk": "Еко-рухливий"}',
    '{"en": "Try a green sport (Nordic walking, tai-chi, plogging…)", "pl": "Wypróbuj zielony sport (Nordic walking, tai-chi, plogging…)", "it": "Prova uno sport verde (Nordic walking, tai-chi, plogging…)", "uk": "Спробуйте зелений спорт (Nordic walking, тай-чі, плогінг…)"}',
    '🌳',
    '{"type": "category", "category": "green"}');
