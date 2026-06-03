-- 0019_football_uk_mixed_script_words.sql
--
-- Final UK cleanup: Llama Scout produced four mixed-script artefacts that a
-- full-text scan caught (Latin letters welded into Cyrillic words / names):
--
--   * rainbow-flick description: "дribbling" - the Cyrillic "д" fused with the
--     Latin "ribbling". Should be "дриблінгу" (dribbling, genitive after "із").
--   * rabona why_matters: "Рікelme" - Cyrillic "Рік" fused with Latin "elme".
--     The player is Juan Roman Riquelme -> "Рікельме".
--   * finishing-first-time + headers-pair-exchange why_matters: "Роберт
--     Lewandowski" left in Latin while every other player name in the same
--     sentence is transliterated (Крістіано Роналду). Transliterate to
--     "Роберт Левандовскі" for consistency.

-- rainbow-flick: "дribbling" -> "дриблінгу"
update public.exercises
   set description = jsonb_set(description, '{uk}',
     to_jsonb(replace(jsonb_extract_path_text(description, 'uk'), 'дribbling', 'дриблінгу')))
 where slug = 'rainbow-flick';

-- rabona: "Рікelme" -> "Рікельме"
update public.exercises
   set why_matters = jsonb_set(why_matters, '{uk}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters, 'uk'), 'Рікelme', 'Рікельме')))
 where slug = 'rabona';

-- finishing-first-time + headers-pair-exchange: "Lewandowski" -> "Левандовскі"
update public.exercises
   set why_matters = jsonb_set(why_matters, '{uk}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters, 'uk'), 'Lewandowski', 'Левандовскі')))
 where slug in ('finishing-first-time', 'headers-pair-exchange');
