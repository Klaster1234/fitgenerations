-- 0015_football_pl_description_fixes.sql
--
-- Follow-up to 0014: same diacritic + vocabulary issues now fixed in the
-- description / why_matters / pro_tip JSONB fields. 0014 only touched the
-- name field, but the AI also wrote the broken forms inside the longer
-- coaching text:
--
--   * "z koni" (= "from horses") in cone-dribbling-slalom description.
--     Should be "przez pachołki" (= "through traffic cones").
--   * "Zwod" (missing o-acute) in 4 trick descriptions / why_matters /
--     pro_tip. Should be "Zwód" (and "Zwód nogą" for step-over).
--   * "Progresja podawania" (= "passing progression") in juggling-progression
--     why_matters. Should be "Progresja żonglerki" (= "juggling progression").
--   * "Biegi Progresywne" (Title Case + outdated phrasing) in
--     progressive-sprints why_matters. Should be "sprinty narastające".
--
-- Each UPDATE uses jsonb_set with replace() so only the .pl key is touched
-- and only the matched substrings change. En/it/uk locales are untouched.

-- ============================================================================
-- 1. cone-dribbling-slalom description: "slalom z koni" -> "slalom przez pachołki"
-- ============================================================================
update public.exercises
   set description = jsonb_set(
     description,
     '{pl}',
     to_jsonb(replace(jsonb_extract_path_text(description, 'pl'), 'slalom z koni', 'slalom przez pachołki'))
   )
 where slug = 'cone-dribbling-slalom';

-- ============================================================================
-- 2. step-over description + why_matters + pro_tip: "Zwod bokiem" / "zwod bokiem"
--    -> "Zwód nogą" / "zwód nogą"
-- ============================================================================
update public.exercises
   set description = jsonb_set(
     description,
     '{pl}',
     to_jsonb(replace(replace(
       jsonb_extract_path_text(description, 'pl'),
       'Zwod bokiem', 'Zwód nogą'),
       'zwod bokiem', 'zwód nogą'))
   )
 where slug = 'step-over';

update public.exercises
   set why_matters = jsonb_set(
     why_matters,
     '{pl}',
     to_jsonb(replace(replace(
       jsonb_extract_path_text(why_matters, 'pl'),
       'Zwod bokiem', 'Zwód nogą'),
       'zwod bokiem', 'zwód nogą'))
   )
 where slug = 'step-over';

update public.exercises
   set pro_tip = jsonb_set(
     pro_tip,
     '{pl}',
     to_jsonb(replace(replace(
       jsonb_extract_path_text(pro_tip, 'pl'),
       'Zwod bokiem', 'Zwód nogą'),
       'zwod bokiem', 'zwód nogą'))
   )
 where slug = 'step-over';

-- ============================================================================
-- 3. body-feint why_matters: "Zwod ciała" -> "Zwód ciałem"
-- ============================================================================
update public.exercises
   set why_matters = jsonb_set(
     why_matters,
     '{pl}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters, 'pl'), 'Zwod ciała', 'Zwód ciałem'))
   )
 where slug = 'body-feint';

-- ============================================================================
-- 4. drag-back why_matters: "Zwod tyłem" -> "Zwód tyłem"
-- ============================================================================
update public.exercises
   set why_matters = jsonb_set(
     why_matters,
     '{pl}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters, 'pl'), 'Zwod tyłem', 'Zwód tyłem'))
   )
 where slug = 'drag-back';

-- ============================================================================
-- 5. cruyff-turn why_matters: "Zwod Cruyffa" -> "Zwód Cruyffa"
-- ============================================================================
update public.exercises
   set why_matters = jsonb_set(
     why_matters,
     '{pl}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters, 'pl'), 'Zwod Cruyffa', 'Zwód Cruyffa'))
   )
 where slug = 'cruyff-turn';

-- ============================================================================
-- 6. juggling-progression why_matters: "Progresja podawania" -> "Progresja żonglerki"
-- ============================================================================
update public.exercises
   set why_matters = jsonb_set(
     why_matters,
     '{pl}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters, 'pl'), 'Progresja podawania', 'Progresja żonglerki'))
   )
 where slug = 'juggling-progression';

-- ============================================================================
-- 7. progressive-sprints why_matters: "Biegi progresywne" / "Biegi Progresywne"
--    -> "Sprinty narastające"
-- ============================================================================
update public.exercises
   set why_matters = jsonb_set(
     why_matters,
     '{pl}',
     to_jsonb(replace(replace(
       jsonb_extract_path_text(why_matters, 'pl'),
       'Biegi Progresywne', 'Sprinty narastające'),
       'Biegi progresywne', 'sprinty narastające'))
   )
 where slug = 'progressive-sprints';
