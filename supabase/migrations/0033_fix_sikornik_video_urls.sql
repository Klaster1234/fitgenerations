-- 0033_fix_sikornik_video_urls.sql
-- Fix: 3 of the 4 SIKORNIK club-session video links seeded in 0032 were dead
-- 404s. They were reused from the LLM-generated football seed (0013), whose
-- YouTube IDs were hallucinated and never existed. Replaced with verified,
-- working videos (each checked via the YouTube oEmbed endpoint).
--   pos 1 rondo             -> lW4IKBow3KE  "Protect The Cone - Rondo Drill"
--   pos 2 injury prevention -> X5YyunLZzBc  "FIFA 11+ Injury Prevention Program"
--   pos 3 tournament        -> iiQXvtltaI8  "Small Sided Games Tournament"
-- (pos 0 mini-band _U950s_AsUg was already valid and is left unchanged.)

update public.group_session_items set video_url = 'https://www.youtube.com/watch?v=lW4IKBow3KE'
  where group_code = 'SIKORNIK' and position = 1;
update public.group_session_items set video_url = 'https://www.youtube.com/watch?v=X5YyunLZzBc'
  where group_code = 'SIKORNIK' and position = 2;
update public.group_session_items set video_url = 'https://www.youtube.com/watch?v=iiQXvtltaI8'
  where group_code = 'SIKORNIK' and position = 3;
