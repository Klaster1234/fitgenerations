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

  const { error } = await supabase
    .from('profiles')
    .update({ interests })
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
