-- 0017_football_uk_fixes.sql
--
-- Ukrainian content fixes for the football catalogue. UK was flagged in
-- AGENTS.md as the weakest Llama Scout output; this migration fixes the
-- CLEAR, objective errors only. Deeper case/gender grammar (e.g. "за однією
-- конусою" should be "за одним конусом" since конус is masculine) is left for
-- a native-speaker pass - fixing it blindly risks introducing new errors.
--
-- Fixed here (unambiguous bugs):
--   * cone-dribbling-slalom name: "Дриблінг через кону slalom" -> contains a
--     LATIN word "slalom" mid-Cyrillic AND wrong "кону". Replace whole name.
--   * agility-t-drill name: "Вправа Т - сприт" -> "сприт" is not a Ukrainian
--     word; agility is "спритність".
--   * drag-back name + why_matters: "Відволікання" (= "distraction") ->
--     "Відтягування" (= "pulling back").
--   * rainbow-flick name + description + why_matters: "Дощовий" (= "rainy")
--     -> "Веселка"/"райдужний" (rainbow). Completely wrong word.
--   * scissors-double-touch name: "Торк" (nonsense transliteration of
--     "touch") -> "дотиком".
--   * wall-pass-rebound name: "Трик зі стіною" -> "Пас у стіну з відскоком".
--   * body-feint name: "Фінт Тіла" -> "Фінт тілом".
--   * side-shuffle-and-pass name: "і Паса" (wrong case) -> "і пас".
--   * cone-dribbling-slalom description: "кону" (wrong cone form) ->
--     "конуси" in the slalom context.
--   * Title Case -> sentence case on affected names.

-- ============================================================================
-- UK name fixes
-- ============================================================================
update public.exercises set name = jsonb_set(name, '{uk}', '"Дриблінг слаломом між конусами"'::jsonb)
  where slug = 'cone-dribbling-slalom';

update public.exercises set name = jsonb_set(name, '{uk}', '"Т-вправа на спритність"'::jsonb)
  where slug = 'agility-t-drill';

update public.exercises set name = jsonb_set(name, '{uk}', '"Відтягування назад"'::jsonb)
  where slug = 'drag-back';

update public.exercises set name = jsonb_set(name, '{uk}', '"Веселка"'::jsonb)
  where slug = 'rainbow-flick';

update public.exercises set name = jsonb_set(name, '{uk}', '"Ножиці з подвійним дотиком"'::jsonb)
  where slug = 'scissors-double-touch';

update public.exercises set name = jsonb_set(name, '{uk}', '"Пас у стіну з відскоком"'::jsonb)
  where slug = 'wall-pass-rebound';

update public.exercises set name = jsonb_set(name, '{uk}', '"Фінт тілом"'::jsonb)
  where slug = 'body-feint';

update public.exercises set name = jsonb_set(name, '{uk}', '"Бічне переміщення і пас"'::jsonb)
  where slug = 'side-shuffle-and-pass';

-- Title Case -> sentence case (Ukrainian capitalises only the first word)
update public.exercises set name = jsonb_set(name, '{uk}', '"Обмін ударами головою в парах"'::jsonb)
  where slug = 'headers-pair-exchange';

update public.exercises set name = jsonb_set(name, '{uk}', '"Прийом і рух з першого дотику"'::jsonb)
  where slug = 'first-touch-receive-and-go';

update public.exercises set name = jsonb_set(name, '{uk}', '"Удар з першого дотику"'::jsonb)
  where slug = 'finishing-first-time';

update public.exercises set name = jsonb_set(name, '{uk}', '"Влучність ударів по мішенях"'::jsonb)
  where slug = 'shooting-accuracy-targets';

update public.exercises set name = jsonb_set(name, '{uk}', '"Міні-цілі 1 на 1"'::jsonb)
  where slug = 'one-v-one-mini-goals';

update public.exercises set name = jsonb_set(name, '{uk}', '"Король пагорба - удари"'::jsonb)
  where slug = 'shooting-king-of-the-hill';

update public.exercises set name = jsonb_set(name, '{uk}', '"Фінт тілом убік"'::jsonb)
  where slug = 'step-over';

-- ============================================================================
-- UK description / why_matters fixes for the worst wrong-word errors
-- ============================================================================

-- rainbow-flick: "Дощовий" (rainy) -> "райдужний" (rainbow) across fields
update public.exercises
   set description = jsonb_set(description, '{uk}',
     to_jsonb(replace(replace(jsonb_extract_path_text(description, 'uk'),
       'Дощовий удар', 'Веселка'), 'Дощовий', 'райдужний')))
 where slug = 'rainbow-flick';

update public.exercises
   set why_matters = jsonb_set(why_matters, '{uk}',
     to_jsonb(replace(replace(jsonb_extract_path_text(why_matters, 'uk'),
       'Дощовий удар', 'Веселка'), 'Дощовий', 'райдужний')))
 where slug = 'rainbow-flick';

-- drag-back why_matters: "Відволікання" (distraction) -> "Відтягування"
update public.exercises
   set why_matters = jsonb_set(why_matters, '{uk}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters, 'uk'),
       'Відволікання', 'Відтягування')))
 where slug = 'drag-back';

-- cone-dribbling-slalom description: "кону" -> "конуси" (the wrong cone form
-- appears as "через кону" / "Встановити кону" - cones, accusative plural)
update public.exercises
   set description = jsonb_set(description, '{uk}',
     to_jsonb(replace(replace(jsonb_extract_path_text(description, 'uk'),
       'через кону', 'через конуси'), 'Встановити кону', 'Встановіть конуси')))
 where slug = 'cone-dribbling-slalom';
