-- 0028_goalkeeper_name_polish.sql
--
-- Native-pass cleanup of goalkeeper exercise NAMES (Groq artefacts, same class
-- as the football 0014/0016/0017 fixes). Clear objective errors only:
--
-- PL: drop the clunky "Ćwiczenie ..." prefix + Title Case; "miękkich par"
--     (= soft PAIRS) -> "miękkich chwytów" (soft catches); "scramble" (English)
--     -> "po dobitce".
-- IT: Title Case -> sentence case; "Esercizio ..." prefix dropped where clunky.
-- UK: "захоплення В" (W-shape became Cyrillic 'В' = B) -> "хват у формі W";
--     "занурення" (= immersion in water) -> "падіння" (a dive); "кік"
--     (bad transliteration) -> "удар від воріт"; "слабою" (typo) -> "слабкою".

-- ===== Polish =====
update public.exercises set name = jsonb_set(name,'{pl}','"Wykop bramkarski"'::jsonb) where slug='gk-distribution-kicking';
update public.exercises set name = jsonb_set(name,'{pl}','"Precyzyjny wyrzut"'::jsonb) where slug='gk-distribution-throwing';
update public.exercises set name = jsonb_set(name,'{pl}','"Chwyt w kształcie W"'::jsonb) where slug='gk-handling-basics';
update public.exercises set name = jsonb_set(name,'{pl}','"Zawężanie kąta"'::jsonb) where slug='gk-positioning-angles';
update public.exercises set name = jsonb_set(name,'{pl}','"Niska parada w padzie"'::jsonb) where slug='gk-low-dive-save';
update public.exercises set name = jsonb_set(name,'{pl}','"Parada po dobitce"'::jsonb) where slug='gk-recovery-save';
update public.exercises set name = jsonb_set(name,'{pl}','"Rozgrzewka miękkich chwytów"'::jsonb) where slug='gk-warmup-handling';

-- ===== Italian =====
update public.exercises set name = jsonb_set(name,'{it}','"Rinvio dal fondo"'::jsonb) where slug='gk-distribution-kicking';
update public.exercises set name = jsonb_set(name,'{it}','"Presa a W"'::jsonb) where slug='gk-handling-basics';
update public.exercises set name = jsonb_set(name,'{it}','"Parata bassa in tuffo"'::jsonb) where slug='gk-low-dive-save';
update public.exercises set name = jsonb_set(name,'{it}','"Parata di recupero"'::jsonb) where slug='gk-recovery-save';

-- ===== Ukrainian =====
update public.exercises set name = jsonb_set(name,'{uk}','"Хват у формі W"'::jsonb) where slug='gk-handling-basics';
update public.exercises set name = jsonb_set(name,'{uk}','"Розіграш ударом від воріт"'::jsonb) where slug='gk-distribution-kicking';
update public.exercises set name = jsonb_set(name,'{uk}','"Сейв у падінні"'::jsonb) where slug='gk-low-dive-save';
update public.exercises set name = jsonb_set(name,'{uk}','"Удари слабкою ногою"'::jsonb) where slug='gk-weak-foot-kicking';
