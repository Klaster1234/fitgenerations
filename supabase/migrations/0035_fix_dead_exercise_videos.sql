-- 0035_fix_dead_exercise_videos.sql
-- Video-link audit (2026-06-29): of 92 exercise videos, 89 were live and 3 were
-- dead (HTTP 404). The football/goalkeeper links were already fixed by earlier
-- migrations; the 3 dead ones were in the general library. Replaced with
-- verified, working, beginner/senior-friendly videos (checked via YouTube oEmbed):
--   flexibility / pilates-hundred : R8-HyJfNhsM -> ku-rTTYenAU  (Pilates Hundred for beginners)
--   green / nordic-walking        : ZDuJ50T-a-w -> zAmsHhc2zCw  (Nordic walking basic technique, SIKANA)
--   warmup / shoulder-rolls       : UTT194HT78k -> X7NtgY9kCCM  (How to do shoulder rolls)

update public.exercises set video_url = 'https://www.youtube.com/watch?v=ku-rTTYenAU' where slug = 'pilates-hundred';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=zAmsHhc2zCw' where slug = 'nordic-walking';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=X7NtgY9kCCM' where slug = 'shoulder-rolls';
