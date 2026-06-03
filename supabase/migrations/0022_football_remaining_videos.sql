-- 0022_football_remaining_videos.sql
--
-- Real, embeddable YouTube tutorials for 27 of the remaining 28 football
-- exercises (warmups, drills, games). Candidates sourced via Gemini Deep
-- Research, then EVERY id independently re-verified here via YouTube oEmbed
-- (HTTP 200 = public + embeddable) on 2026-06 before committing - Gemini's
-- own "I checked embedding" claim was not trusted.
--
-- 28/28 passed oEmbed. One was SKIPPED for relevance, not embeddability:
--   goalkeeper-challenge-weak-foot -> the candidate was a freestyle
--   "two-touch challenge", not a goalkeeper + weak-foot drill. Left NULL
--   rather than ship a mismatched video; to be backfilled later.
--
-- A handful of the 27 below are reputable but somewhat GENERIC (a full
-- training session that contains the drill rather than an isolated tutorial):
-- high-knees-with-ball-pickup, side-shuffle-and-pass, open-close-the-gate,
-- dynamic-leg-swings-ball, juggling-progression, intergenerational-10-passes.
-- Acceptable for alpha (all are real, embeddable football coaching content);
-- flagged for optional future refinement.

-- Warmups
update public.exercises set video_url = 'https://www.youtube.com/watch?v=OfAklXkSnqI' where slug = 'football-jogging-with-ball';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=X5YyunLZzBc' where slug = 'fifa-11plus-running-program';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=cCdcG5ixwxY' where slug = 'dynamic-leg-swings-ball';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=cws1X0AEEkU' where slug = 'ladder-agility-warmup';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=wKpUupKZ6zs' where slug = 'high-knees-with-ball-pickup';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=79loVuNZlUo' where slug = 'side-shuffle-and-pass';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=DDtKRtY6N3M' where slug = 'open-close-the-gate';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=HEfa8QIknNo' where slug = 'progressive-sprints';

-- Drills
update public.exercises set video_url = 'https://www.youtube.com/watch?v=L7gfjaX2ve0' where slug = 'wall-pass-rebound';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=Zu4pDph4DZc' where slug = 'cone-dribbling-slalom';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=oOhohKfAKBE' where slug = 'shooting-accuracy-targets';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=el7QvVnprOk' where slug = 'first-touch-receive-and-go';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=okfgZ9HU1Xw' where slug = 'weak-foot-100-touches';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=kQkBmzmC4r8' where slug = 'juggling-progression';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=ceMFekk-xdE' where slug = 'one-v-one-defense-stance';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=k2RnYjeRc1w' where slug = 'long-pass-accuracy';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=l_1Gr9l0OaA' where slug = 'headers-pair-exchange';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=LWp_viQx04M' where slug = 'finishing-first-time';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=3UM5GcBPuV4' where slug = 'set-piece-corner-delivery';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=cRowvUOWNVg' where slug = 'agility-t-drill';

-- Games
update public.exercises set video_url = 'https://www.youtube.com/watch?v=x1X5DyV7mB0' where slug = 'one-v-one-mini-goals';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=GMuQWVF06U4' where slug = 'two-v-two-possession-rondo';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=MScHTwr3zYs' where slug = 'three-v-three-mini-match';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=KeQWSLSaaUg' where slug = 'world-cup-tournament';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=TPlUfs0f850' where slug = 'intergenerational-10-passes';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=pfzT4M0Ywpc' where slug = 'freestyle-juggling-comp';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=4OeVb4NGLwo' where slug = 'shooting-king-of-the-hill';
