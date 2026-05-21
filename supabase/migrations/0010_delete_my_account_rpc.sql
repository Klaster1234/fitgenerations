-- 0010_delete_my_account_rpc.sql
--
-- Adds the SECURITY DEFINER RPC `delete_my_account()` that lets a signed-in
-- user delete their own auth.users row. FK cascades from migration 0001
-- (profiles.id, daily_plans.user_id, activity_logs.user_id, user_badges.user_id,
-- challenge_videos.user_id all reference auth.users with on delete cascade)
-- wipe the personal data that lives in the public schema.
--
-- We can't `delete from auth.users` from a normal RLS context because the
-- table is owned by the auth schema. The RPC runs with the function owner's
-- rights (postgres) and is restricted to deleting the caller's own row via
-- `auth.uid()`. There is no parameter, so the user can't pick someone else's
-- id.
--
-- Aggregate / anonymised statistics already exported for the Erasmus+
-- funder are out of scope here and stay where they are. The privacy notice
-- mentions this explicitly.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- FK cascades on auth.users do the rest (profiles, daily_plans,
  -- activity_logs, user_badges, challenge_videos).
  delete from auth.users where id = v_uid;
end;
$$;

-- Lock down execution to authenticated users only; PUBLIC must not be
-- able to invoke this even though SECURITY DEFINER would otherwise
-- elevate. The auth.uid() check inside is the real gate, but defence in
-- depth is cheap.
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'GDPR right-to-erasure entrypoint. Deletes the caller''s auth.users row; '
  'FK cascades remove all linked profile / plan / activity / badge / video '
  'rows. SECURITY DEFINER because auth.users is owned by the auth schema.';
