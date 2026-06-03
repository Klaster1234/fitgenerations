-- 0018_football_uk_agility_word.sql
--
-- Follow-up to 0017: the non-word "сприт" (Llama Scout's broken form of
-- "спритність" = agility) survived in agility-t-drill description and
-- why_matters. 0017 fixed the name but not these two longer fields.
-- Replace standalone "сприт " with "спритність ".

update public.exercises
   set description = jsonb_set(description, '{uk}',
     to_jsonb(replace(jsonb_extract_path_text(description, 'uk'), 'сприт ', 'спритність ')))
 where slug = 'agility-t-drill';

update public.exercises
   set why_matters = jsonb_set(why_matters, '{uk}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters, 'uk'), 'сприт ', 'спритність ')))
 where slug = 'agility-t-drill';
