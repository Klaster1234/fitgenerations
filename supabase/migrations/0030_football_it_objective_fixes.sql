-- 0030_football_it_objective_fixes.sql
--
-- Objective Italian (it) content fixes from a native-review audit of the
-- football + goalkeeper catalogue. Stylistic nuance still goes to EURO-NET
-- (Luigi) for a final native pass; this migration only corrects unambiguous
-- errors:
--
--   1. step-over / drag-back: migration 0016 fixed the NAMES ("Doppio passo",
--      "Trascinamento all'indietro") but description/why_matters/pro_tip kept
--      the old term ("finta laterale" / "tiro indietro") -> name and body
--      disagreed on the card. Sync the body to the approved name.
--   2. Leftover English in IT: "step-over" (juggling-progression),
--      "javelin"/"roll" (gk-distribution-throwing), "Follow-through"
--      (gk-weak-foot-kicking).
--   3. Goalkeeper "Presenza" mistranslation for hands / hand placement (MT
--      artefact) -> "Mani" / "Posizione" (4 exercises).
--   4. U+2011 (non-breaking hyphen) -> normal "-" across ALL locales of the
--      goalkeeper seed (0026), per the project's no-special-dashes rule.
--
-- Pattern follows 0016/0029: jsonb_set on the {it} path with a scoped replace,
-- or a full {it} array rebuild for key_focus (so the identical "Follow-through"
-- string that also lives in the {en} array is left untouched).

-- ============================================================================
-- 1. step-over: body still said "finta laterale" (name is "Doppio passo")
-- ============================================================================
update public.exercises
   set description = jsonb_set(description,'{it}',
     to_jsonb(replace(jsonb_extract_path_text(description,'it'),'La finta laterale','Il doppio passo')))
 where slug = 'step-over';

update public.exercises
   set why_matters = jsonb_set(why_matters,'{it}',
     to_jsonb(replace(jsonb_extract_path_text(why_matters,'it'),'La finta laterale','Il doppio passo')))
 where slug = 'step-over';

update public.exercises
   set pro_tip = jsonb_set(pro_tip,'{it}',
     to_jsonb(replace(jsonb_extract_path_text(pro_tip,'it'),'la finta laterale','il doppio passo')))
 where slug = 'step-over';

-- ============================================================================
-- 2. drag-back: body still said "(il) tiro indietro"
--    (name is "Trascinamento all'indietro")
-- ============================================================================
update public.exercises
   set description = jsonb_set(description,'{it}',
     to_jsonb(
       replace(
         replace(
           replace(jsonb_extract_path_text(description,'it'),
             'tirando indietro la palla','trascinando indietro la palla'),
           'per tirare indietro la palla','per trascinare indietro la palla'),
         'Mentre tiri indietro la palla','Mentre trascini indietro la palla')))
 where slug = 'drag-back';

update public.exercises
   set why_matters = jsonb_set(why_matters,'{it}',
     to_jsonb(
       replace(
         replace(jsonb_extract_path_text(why_matters,'it'),
           'Il tiro indietro','Il trascinamento all''indietro'),
         'il tiro indietro','il trascinamento all''indietro')))
 where slug = 'drag-back';

update public.exercises
   set pro_tip = jsonb_set(pro_tip,'{it}',
     to_jsonb(replace(jsonb_extract_path_text(pro_tip,'it'),
       'il tiro indietro','il trascinamento all''indietro')))
 where slug = 'drag-back';

-- ============================================================================
-- 3. juggling-progression: leftover English "step-over" in IT
-- ============================================================================
update public.exercises
   set description = jsonb_set(description,'{it}',
     to_jsonb(replace(jsonb_extract_path_text(description,'it'),
       'come step-over','come il doppio passo')))
 where slug = 'juggling-progression';

-- ============================================================================
-- 4. U+2011 (non-breaking hyphen, chr(8209)) -> "-" across the goalkeeper seed
--    (all locales). Runs BEFORE the key_focus {it} rebuilds below.
-- ============================================================================
update public.exercises set
  name        = replace(name::text,        chr(8209), '-')::jsonb,
  description = replace(description::text, chr(8209), '-')::jsonb,
  why_matters = replace(why_matters::text, chr(8209), '-')::jsonb,
  key_focus   = replace(key_focus::text,   chr(8209), '-')::jsonb,
  pro_tip     = replace(pro_tip::text,     chr(8209), '-')::jsonb
 where category = 'football_goalkeeper';

-- ============================================================================
-- 5. gk-distribution-throwing: leftover English "roll" / "javelin" in IT
--    (description + pro_tip; key_focus handled in the rebuild block below)
-- ============================================================================
update public.exercises
   set description = jsonb_set(description,'{it}',
     to_jsonb(
       replace(
         replace(
           replace(jsonb_extract_path_text(description,'it'),
             'il roll e il lancio javelin','il rotolamento e il lancio sopra la spalla'),
           'Dopo il roll','Dopo il rotolamento'),
         'e lancia un javelin','ed esegue un lancio sopra la spalla')))
 where slug = 'gk-distribution-throwing';

update public.exercises
   set pro_tip = jsonb_set(pro_tip,'{it}',
     to_jsonb(replace(jsonb_extract_path_text(pro_tip,'it'),
       'rilascio del javelin','rilascio del lancio sopra la spalla')))
 where slug = 'gk-distribution-throwing';

-- ============================================================================
-- 6. key_focus {it} array rebuilds (Presenza -> Mani/Posizione; javelin/roll;
--    Follow-through). Full {it} arrays so the identical "Follow-through" in the
--    {en} array is not affected.
-- ============================================================================
update public.exercises set key_focus = jsonb_set(key_focus,'{it}',
  '["Mani a forma di W","Mani morbide al contatto","Ripristino rapido","Controllo al petto","Posizione dei piedi corretta"]'::jsonb)
 where slug = 'gk-handling-basics';

update public.exercises set key_focus = jsonb_set(key_focus,'{it}',
  '["Posizione equilibrata","Uscita esplosiva","Mani morbide","Recupero rapido"]'::jsonb)
 where slug = 'gk-shot-stopping-reactions';

update public.exercises set key_focus = jsonb_set(key_focus,'{it}',
  '["Posizione di partenza","Riduzione dell''angolo","Movimento dei piedi","Posizione della mano","Recupero rapido"]'::jsonb)
 where slug = 'gk-positioning-angles';

update public.exercises set key_focus = jsonb_set(key_focus,'{it}',
  '["Scatto esplosivo verso l''alto","Posizione stabile della mano","Ripristino visivo rapido","Posizionamento preciso dei piedi"]'::jsonb)
 where slug = 'gk-recovery-save';

update public.exercises set key_focus = jsonb_set(key_focus,'{it}',
  '["Posizione del piede nel rotolamento","Allineamento del corpo nel lancio sopra la spalla","Precisione del bersaglio","Punto di rilascio costante"]'::jsonb)
 where slug = 'gk-distribution-throwing';

update public.exercises set key_focus = jsonb_set(key_focus,'{it}',
  '["Posizione del piede","Angolo del corpo","Movimento di accompagnamento","Precisione","Equilibrio"]'::jsonb)
 where slug = 'gk-weak-foot-kicking';
