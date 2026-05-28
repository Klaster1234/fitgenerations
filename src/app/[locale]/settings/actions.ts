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

  revalidatePath('/[locale]/settings', 'page');
  revalidatePath('/[locale]/plan', 'page');
}
