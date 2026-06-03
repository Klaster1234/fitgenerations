-- 0021_football_cruyff_description.sql
--
-- Last PL diacritic miss, caught by a visual check of the live card (the
-- earlier scans used a trailing-space pattern and missed the comma form):
--   cruyff-turn description: "Zwod," -> "Zwód," and "zwrot" -> "zwrót".
-- A full plain-substring re-scan across all 4 locales confirmed these are the
-- only remaining real issues (other matches like PL "przyspieszeniu" and IT
-- "tiri alti e bassi" are correct words, false positives).

update public.exercises
   set description = jsonb_set(description, '{pl}',
     to_jsonb(replace(replace(jsonb_extract_path_text(description, 'pl'),
       'Zwod,', 'Zwód,'), 'szybki zwrot', 'szybki zwrót')))
 where slug = 'cruyff-turn';
