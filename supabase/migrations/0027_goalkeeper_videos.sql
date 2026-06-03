-- 0027_goalkeeper_videos.sql
--
-- Real, embeddable YouTube tutorials for the 14 goalkeeper exercises. Every id
-- was WebSearch-sourced from reputable GK coaching channels (Pro GK Academy,
-- Ground Glory, OP1GK, Keeperstop, Conor O'Keefe, RushGK) and independently
-- re-verified here via YouTube oEmbed (HTTP 200 = public + embeddable) before
-- committing - the same gate used for the football trick/drill videos.
-- 14/14 passed.

update public.exercises set video_url = 'https://www.youtube.com/watch?v=gn9Mb5esFZY' where slug = 'gk-handling-basics';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=XC2hZh5XpwE' where slug = 'gk-warmup-handling';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=6jMqfZfo9XI' where slug = 'gk-footwork-set-position';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=zd5lTYx0-QE' where slug = 'gk-low-dive-save';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=d93aCRjx5ik' where slug = 'gk-high-catch';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=PVXF439mc5Y' where slug = 'gk-shot-stopping-reactions';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=nm6kg1w_wBM' where slug = 'gk-reflex-wall-rebound';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=RVSEYzcGaic' where slug = 'gk-positioning-angles';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=Hy10XUls8xs' where slug = 'gk-1v1-closing-down';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=w7QMKRNLUK4' where slug = 'gk-cross-claiming';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=kIR875RdKpA' where slug = 'gk-distribution-throwing';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=hutj6Eab8ZM' where slug = 'gk-distribution-kicking';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=bWIw_P1N4es' where slug = 'gk-weak-foot-kicking';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=Cpyz87uujrY' where slug = 'gk-recovery-save';
