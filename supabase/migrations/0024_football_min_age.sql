-- 0024_football_min_age.sql
--
-- Second latent "broken in real use" bug found in the deep review: 39/40
-- football exercises were seeded with min_age=12, so a football player aged
-- 6-11 got 1/40 exercises (only intergenerational-10-passes, min_age=8) and
-- therefore a generic, non-football plan.
--
-- This directly contradicts the spec's own user story "Tomek (10) z dziadkiem"
-- (a 10-year-old football pair user) and the intergenerational mandate. Kids
-- play football from a young age and the drills/tricks/games are all doable
-- by 8+ (with adult guidance in the intergenerational context). The
-- difficulty filter still scales content to fitness level, so a young
-- beginner only sees low-difficulty football items.
--
-- Lower min_age to 8 for all football exercises. max_age is unchanged (99).

update public.exercises
   set min_age = 8
 where category like 'football_%'
   and min_age > 8;
