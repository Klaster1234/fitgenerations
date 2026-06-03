-- 0014_football_pl_name_fixes_and_dead_videos.sql
--
-- Two related cleanups for the football catalogue (live since 0013):
--
-- 1. Polish name fixes - Llama Scout (used as content generator) stripped
--    diacritics in trick names ("Zwod" should be "Zwód"), used wrong nouns
--    ("koni" = horses instead of "pachołki" = traffic cones, "wahania" =
--    swinging-of-doubt instead of "wymachy" = swings-of-the-leg, etc.) and
--    rendered everything in Title Case which reads as machine-translated in
--    Polish. This migration replaces the .pl name of 21 affected exercises
--    with corrections from a native-speaker pass.
--
-- 2. Video URLs - all 40 video_url values were placeholder YouTube IDs from
--    the Phase 6 plan; an oEmbed sweep confirmed 40/40 return "Video
--    unavailable". Better to render exercise cards without an iframe than
--    with the YouTube error embed. Set video_url = NULL for every football
--    exercise. Real URLs will be backfilled by Adrian/Pan Dariusz in 0015.
--
-- This migration is idempotent: each UPDATE only touches the .pl key via
-- jsonb_set, leaving other locale keys (en/it/uk) untouched.

-- ============================================================================
-- 1. Polish name corrections (jsonb_set keeps en/it/uk intact)
-- ============================================================================

-- Tricks: "Zwod" -> "Zwód" (missing the o-acute)
update public.exercises set name = jsonb_set(name, '{pl}', '"Zwód Cruyffa"'::jsonb)
  where slug = 'cruyff-turn';

update public.exercises set name = jsonb_set(name, '{pl}', '"Zwód ciałem"'::jsonb)
  where slug = 'body-feint';

update public.exercises set name = jsonb_set(name, '{pl}', '"Zwód tyłem"'::jsonb)
  where slug = 'drag-back';

-- step-over is "Zwód nogą" in Polish football terminology, not "Zwód bokiem"
update public.exercises set name = jsonb_set(name, '{pl}', '"Zwód nogą"'::jsonb)
  where slug = 'step-over';

update public.exercises set name = jsonb_set(name, '{pl}', '"Zwód strzałem"'::jsonb)
  where slug = 'fake-shot';

update public.exercises set name = jsonb_set(name, '{pl}', '"Nożyce z podwójnym dotykiem"'::jsonb)
  where slug = 'scissors-double-touch';

-- Drills: wrong nouns + sentence case
update public.exercises set name = jsonb_set(name, '{pl}', '"Drybling slalomem przez pachołki"'::jsonb)
  where slug = 'cone-dribbling-slalom';

update public.exercises set name = jsonb_set(name, '{pl}', '"Progresja żonglerki"'::jsonb)
  where slug = 'juggling-progression';

update public.exercises set name = jsonb_set(name, '{pl}', '"Wymiana główek w parze"'::jsonb)
  where slug = 'headers-pair-exchange';

update public.exercises set name = jsonb_set(name, '{pl}', '"Strzały do celów"'::jsonb)
  where slug = 'shooting-accuracy-targets';

update public.exercises set name = jsonb_set(name, '{pl}', '"Pierwszy dotyk i ruszenie"'::jsonb)
  where slug = 'first-touch-receive-and-go';

update public.exercises set name = jsonb_set(name, '{pl}', '"Ćwiczenie T na zwinność"'::jsonb)
  where slug = 'agility-t-drill';

-- Warmups: sentence case + correct vocabulary
update public.exercises set name = jsonb_set(name, '{pl}', '"Dynamiczne wymachy nóg z piłką"'::jsonb)
  where slug = 'dynamic-leg-swings-ball';

update public.exercises set name = jsonb_set(name, '{pl}', '"Wysokie kolana z podnoszeniem piłki"'::jsonb)
  where slug = 'high-knees-with-ball-pickup';

update public.exercises set name = jsonb_set(name, '{pl}', '"Otwieranie i zamykanie biodra"'::jsonb)
  where slug = 'open-close-the-gate';

update public.exercises set name = jsonb_set(name, '{pl}', '"Sprinty narastające"'::jsonb)
  where slug = 'progressive-sprints';

update public.exercises set name = jsonb_set(name, '{pl}', '"Krok dostawny i podanie"'::jsonb)
  where slug = 'side-shuffle-and-pass';

update public.exercises set name = jsonb_set(name, '{pl}', '"Bieganie z piłką"'::jsonb)
  where slug = 'football-jogging-with-ball';

-- Games: word order + sentence case
update public.exercises set name = jsonb_set(name, '{pl}', '"Turniej w stylu mistrzostw świata"'::jsonb)
  where slug = 'world-cup-tournament';

update public.exercises set name = jsonb_set(name, '{pl}', '"10 podań międzypokoleniowych"'::jsonb)
  where slug = 'intergenerational-10-passes';

update public.exercises set name = jsonb_set(name, '{pl}', '"Strzelecki król wzgórza"'::jsonb)
  where slug = 'shooting-king-of-the-hill';

-- ============================================================================
-- 2. Null out all 40 football video URLs (oEmbed sweep 2026-05-28
--    confirmed 40/40 placeholder IDs return "Video unavailable")
-- ============================================================================
update public.exercises
   set video_url = null
 where category like 'football_%';
