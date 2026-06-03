-- 0020_football_trick_videos.sql
--
-- Real, embeddable YouTube tutorial URLs for the 12 football tricks. Every ID
-- below was verified two ways on 2026-06 before committing:
--   1. WebSearch to find a reputable "how to" tutorial (coaching channels,
--      not FIFA/eFootball video-game button guides, not Shorts).
--   2. YouTube oEmbed returning HTTP 200 (confirms public AND embeddable -
--      embedding-disabled videos return 403, which is how the first rainbow
--      candidate was caught and swapped).
--
-- Channels: AllAttack, Unisport, Online Soccer Academy, 7mlc, ZTH Training,
-- SIKANA English, Football Skills Coach - all allow third-party embedding.
--
-- The other 28 football exercises (warmups, drills, games) still have
-- video_url = NULL from migration 0014; those will be backfilled separately.

update public.exercises set video_url = 'https://www.youtube.com/watch?v=V9klCWR_nKk' where slug = 'cruyff-turn';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=b7P5MBS6yhc' where slug = 'step-over';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=6MCxdaKRHws' where slug = 'scissors-double-touch';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=1_D_U-T8b_M' where slug = 'elastico';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=Zfxq6xLTztw' where slug = 'rabona';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=uyXDSfHxx4I' where slug = 'rainbow-flick';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=BqZfsuMw9r0' where slug = 'maradona-spin';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=JF-fR7WsE6E' where slug = 'fake-shot';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=neA1TK3625c' where slug = 'body-feint';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=aWu1bo1BccM' where slug = 'drag-back';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=Q-otzeksAlo' where slug = 'la-croqueta';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=JHRXwBXA1eU' where slug = 'no-look-pass';
