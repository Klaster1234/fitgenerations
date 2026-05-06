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
