'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const VALID_INTERESTS = ['fitness', 'football', 'green'] as const;

export async function updateInterests(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const interests = formData
    .getAll('interests')
    .filter(
      (v): v is (typeof VALID_INTERESTS)[number] =>
        typeof v === 'string' && (VALID_INTERESTS as readonly string[]).includes(v),
    );

  // Unchecked checkboxes are absent from FormData, so a missing value means
  // false. composeGoalkeeperPlan only acts on this for football users.
  const isGoalkeeper =
    formData.get('is_goalkeeper') === 'on' || formData.get('is_goalkeeper') === 'true';

  const { error } = await supabase
    .from('profiles')
    .update({ interests, is_goalkeeper: isGoalkeeper })
    .eq('id', userData.user.id);

  if (error) {
    console.error('[settings/updateInterests] failed', error);
    return;
  }

  // Drop today's plan so it regenerates with the new interests on the next
  // /plan load. Without this, toggling football on mid-day would keep showing
  // the old generic plan until tomorrow (ensureTodayPlan only regenerates on
  // a locale mismatch or an explicit regenerate). RLS daily_plans_self_all
  // lets the user delete their own row.
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from('daily_plans')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('plan_date', today);

  revalidatePath('/[locale]/settings', 'page');
  revalidatePath('/[locale]/plan', 'page');
}

export async function updateGroupCode(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const raw = String(formData.get('group_code') ?? '')
    .trim()
    .toUpperCase();

  // Same schema as onboarding: 4-12 uppercased alphanumerics, empty clears
  // the group. Invalid input is ignored (the input's pattern/maxLength guard
  // this client-side; seniors get no scary error for a stray character).
  if (raw !== '' && !/^[A-Z0-9]{4,12}$/.test(raw)) return;

  const { error } = await supabase
    .from('profiles')
    .update({ group_code: raw === '' ? null : raw })
    .eq('id', userData.user.id);

  if (error) {
    console.error('[settings/updateGroupCode] failed', error);
    return;
  }

  revalidatePath('/[locale]/settings', 'page');
  revalidatePath('/[locale]/group/[code]', 'page');
}

// Feature requested by trainer Mateusz Czub during the alpha tests: free-text
// notes / preferences the user can type so the AI tailors the daily plan
// (an injury to spare, exercises they like or dislike, a focus area, time).
export async function updateTrainingPreferences(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  // Trim, collapse to <=500 chars (matches the DB constraint), empty clears it.
  // We store null rather than '' so the generator's "non-empty" check is simple.
  const raw = String(formData.get('training_preferences') ?? '').trim().slice(0, 500);

  const { error } = await supabase
    .from('profiles')
    .update({ training_preferences: raw === '' ? null : raw })
    .eq('id', userData.user.id);

  if (error) {
    console.error('[settings/updateTrainingPreferences] failed', error);
    return;
  }

  // Drop today's plan so it regenerates with the new preferences on the next
  // /plan load, same as updateInterests - otherwise the user wouldn't see their
  // note reflected until tomorrow. RLS daily_plans_self_all allows the delete.
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from('daily_plans')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('plan_date', today);

  revalidatePath('/[locale]/settings', 'page');
  revalidatePath('/[locale]/plan', 'page');
}
