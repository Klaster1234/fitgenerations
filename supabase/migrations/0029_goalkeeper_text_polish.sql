-- 0029_goalkeeper_text_polish.sql
--
-- Description/why_matters polish for goalkeeper content. Only real errors
-- (the "Ćwiczenie ..." sentence starts and "Esercizio di precisione" /
-- "Rinvio dal fondo" are correct phrasing - false positives, left alone):
--
--   PL gk-warmup-handling why_matters: "miękkich par" (= soft PAIRS) ->
--     "miękkich chwytów" (soft catches).
--   IT gk-positioning-angles name: "Esercizio riduzione angolo" (clunky,
--     missing article) -> "Riduzione dell'angolo".
--   UK gk-low-dive-save desc + why_matters: "занурення" (= immersion in
--     water) -> "падіння" (a dive/fall).
--   UK gk-weak-foot-kicking description: "слабою" (typo) -> "слабкою".

-- PL: miękkich par -> miękkich chwytów
update public.exercises
   set why_matters = jsonb_set(why_matters,'{pl}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters,'pl'),'miękkich par','miękkich chwytów')))
 where slug = 'gk-warmup-handling';

-- IT: cleaner name
update public.exercises set name = jsonb_set(name,'{it}','"Riduzione dell''angolo"'::jsonb)
 where slug = 'gk-positioning-angles';

-- UK: занурення -> падіння (description + why_matters)
update public.exercises
   set description = jsonb_set(description,'{uk}',
     to_jsonb(replace(jsonb_extract_path_text(description,'uk'),'занурення','падіння')))
 where slug = 'gk-low-dive-save';

update public.exercises
   set why_matters = jsonb_set(why_matters,'{uk}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters,'uk'),'занурення','падіння')))
 where slug = 'gk-low-dive-save';

-- UK: слабою -> слабкою
update public.exercises
   set description = jsonb_set(description,'{uk}',
     to_jsonb(replace(jsonb_extract_path_text(description,'uk'),'слабою','слабкою')))
 where slug = 'gk-weak-foot-kicking';
