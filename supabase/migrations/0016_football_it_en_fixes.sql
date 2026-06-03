-- 0016_football_it_en_fixes.sql
--
-- Italian + English content fixes for the football catalogue (same kind of
-- machine-translation artefacts found in PL via 0014/0015).
--
-- ITALIAN (clear objective errors; final nuance pass still belongs to Luigi):
--   * side-shuffle-and-pass name: "Sfondo Laterale" (= "side BACKGROUND")
--     -> "Spostamento laterale" (= "side shift"). "Sfondo" is just wrong.
--   * drag-back name: "Tiro indietro" (= "shot backward") -> "Trascinamento
--     all'indietro". A drag-back pulls the ball back with the sole; "tiro"
--     (shot) is the wrong verb entirely.
--   * rainbow-flick name: "Flick di Rainbow" (half English) -> "Colpo
--     dell'arcobaleno".
--   * step-over name: "Finta Laterale" -> "Doppio passo" (the standard
--     Italian football term for a step-over).
--   * high-knees name + description: "ginocchia alti" -> "ginocchia alte"
--     (ginocchia is feminine plural, needs "alte").
--   * wall-pass-rebound name: "Rimbalzo di Passaggio" -> "Passaggio al muro".
--   * shooting-accuracy-targets name: "Tiri Precisi Bersagli" (noun stack)
--     -> "Tiri di precisione sui bersagli".
--   * headers-pair-exchange name: "Scambio di Testa" (= "swapping heads")
--     -> "Scambio di colpi di testa in coppia".
--   * cone-dribbling-slalom name: word-order cleanup.
--   * Title Case -> sentence case on a few names.
--
-- ENGLISH:
--   * weak-foot-100-touches name dropped the "100" that every other locale
--     kept. Restore it.

-- ============================================================================
-- ITALIAN name fixes
-- ============================================================================
update public.exercises set name = jsonb_set(name, '{it}', '"Spostamento laterale e passaggio"'::jsonb)
  where slug = 'side-shuffle-and-pass';

update public.exercises set name = jsonb_set(name, '{it}', '"Trascinamento all''indietro"'::jsonb)
  where slug = 'drag-back';

update public.exercises set name = jsonb_set(name, '{it}', '"Colpo dell''arcobaleno"'::jsonb)
  where slug = 'rainbow-flick';

update public.exercises set name = jsonb_set(name, '{it}', '"Doppio passo"'::jsonb)
  where slug = 'step-over';

update public.exercises set name = jsonb_set(name, '{it}', '"Corsa con ginocchia alte e recupero palla"'::jsonb)
  where slug = 'high-knees-with-ball-pickup';

update public.exercises set name = jsonb_set(name, '{it}', '"Passaggio al muro"'::jsonb)
  where slug = 'wall-pass-rebound';

update public.exercises set name = jsonb_set(name, '{it}', '"Tiri di precisione sui bersagli"'::jsonb)
  where slug = 'shooting-accuracy-targets';

update public.exercises set name = jsonb_set(name, '{it}', '"Scambio di colpi di testa in coppia"'::jsonb)
  where slug = 'headers-pair-exchange';

update public.exercises set name = jsonb_set(name, '{it}', '"Dribbling a slalom tra i coni"'::jsonb)
  where slug = 'cone-dribbling-slalom';

-- Title Case -> sentence case (Italian doesn't capitalise every word)
update public.exercises set name = jsonb_set(name, '{it}', '"Finta di corpo"'::jsonb)
  where slug = 'body-feint';

update public.exercises set name = jsonb_set(name, '{it}', '"Tiro finto"'::jsonb)
  where slug = 'fake-shot';

update public.exercises set name = jsonb_set(name, '{it}', '"Forbice con doppio tocco"'::jsonb)
  where slug = 'scissors-double-touch';

-- ============================================================================
-- ITALIAN description fix: high-knees "ginocchia alti" -> "ginocchia alte"
-- ============================================================================
update public.exercises
   set description = jsonb_set(
     description,
     '{it}',
     to_jsonb(replace(jsonb_extract_path_text(description, 'it'), 'ginocchia alti', 'ginocchia alte'))
   )
 where slug = 'high-knees-with-ball-pickup';

-- ============================================================================
-- ENGLISH: restore the dropped "100"
-- ============================================================================
update public.exercises set name = jsonb_set(name, '{en}', '"Weak Foot 100 Touches"'::jsonb)
  where slug = 'weak-foot-100-touches';
