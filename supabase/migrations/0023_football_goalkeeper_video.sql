-- 0023_football_goalkeeper_video.sql
--
-- Closes the last gap: goalkeeper-challenge-weak-foot had video_url = NULL
-- after 0022 (its Deep Research candidate was a freestyle juggling challenge,
-- not a goalkeeper drill). Replaced with a real goalkeeper shot-stopping
-- training session (ARS Goalkeeping), oEmbed-verified HTTP 200 / embeddable.
-- All 40 football exercises now have a video.

update public.exercises
   set video_url = 'https://www.youtube.com/watch?v=WOFk9j5UMDU'
 where slug = 'goalkeeper-challenge-weak-foot';
