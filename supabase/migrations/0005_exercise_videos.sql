-- Fill missing video_url for 31 exercises with senior-friendly YouTube demos.
-- Sources: HASfit, More Life Health, Yoga With Adriene, Ask Doctor Jo, Bob & Brad,
-- NBC News (plogging), Brodie Smith (frisbee), PE-teacher channels (relay/beanbag/petanque).
-- pair-mirror is intentionally left NULL — no quality partner mirror-game demo found;
-- description in DB is self-contained.

update public.exercises set video_url = 'https://www.youtube.com/watch?v=QilgMPG7OaA' where slug = 'marching-in-place';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=azv8eJgoGLk' where slug = 'chair-sit-to-stand';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=QpMTk21EmaM' where slug = 'wall-pushup';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=R1RF1PbYSQQ' where slug = 'single-leg-stand';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=oJX8EKF3TqM' where slug = 'seated-forward-fold';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=OMuHf1wQIug' where slug = 'brisk-walk';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=LiUnFJ8P4gM' where slug = 'deep-breathing';

update public.exercises set video_url = 'https://www.youtube.com/watch?v=UTT194HT78k' where slug = 'shoulder-rolls';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=Q-oOYQipCg8' where slug = 'hip-circles';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=T2s9nByxqvk' where slug = 'lunge';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=wPM8icPu6H8' where slug = 'glute-bridge';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=WkNuYbWZ8g8' where slug = 'row-band';

update public.exercises set video_url = 'https://www.youtube.com/watch?v=z_GKdFf3qv4' where slug = 'heel-to-toe-walk';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=yVE4XXFFO70' where slug = 'tree-pose';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=m8g_S6mwvPk' where slug = 'yoga-cat-cow';

update public.exercises set video_url = 'https://www.youtube.com/watch?v=Bqy1xIXX2nc' where slug = 'jumping-jacks';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=ddMydIUCXCI' where slug = 'step-ups';

update public.exercises set video_url = 'https://www.youtube.com/watch?v=npujNfsmX28' where slug = 'neck-stretches';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=z4tN_WEzFWg' where slug = 'thoracic-rotation';

update public.exercises set video_url = 'https://www.youtube.com/watch?v=0kOOvLPN23Q' where slug = 'forward-fold-stand';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=wr_8aak4Wbc' where slug = 'hamstring-stretch';

update public.exercises set video_url = 'https://www.youtube.com/watch?v=v0c8xMAd3eA' where slug = 'plogging';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=Mlf7nfKYK40' where slug = 'outdoor-frisbee';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=XUaClN-gTgI' where slug = 'eco-walk';

update public.exercises set video_url = 'https://www.youtube.com/watch?v=nqsoZGsrB6k' where slug = 'petanque-practice';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=DGaj7FOs4BY' where slug = 'target-throwing';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=X3V7g7jXreo' where slug = 'mini-relay';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=1rnqA1ufeA8' where slug = 'three-on-three';

update public.exercises set video_url = 'https://www.youtube.com/watch?v=3joCvSjktwI' where slug = 'pair-toss';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=7SF7AYh2_Yw' where slug = 'pair-balance-hold';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=HVFQS3RLFTQ' where slug = 'pair-stretch-back';
