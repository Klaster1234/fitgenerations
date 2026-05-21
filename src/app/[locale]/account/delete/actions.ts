'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

// User must type this exact string. Kept in English regardless of locale so
// the destructive confirmation is unambiguous in logs and code review.
const CONFIRM_WORD = 'DELETE';

const deleteSchema = z.object({
  confirm: z.literal(CONFIRM_WORD),
});

export type DeleteAccountState = {
  ok: boolean;
  error?: 'confirmMismatch' | 'unauthorized' | 'rpc';
};

function pickLocale(value: FormDataEntryValue | null): Locale {
  if (typeof value === 'string' && (routing.locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return routing.defaultLocale;
}

/**
 * Delete the current user's account. Flow:
 *   1. Validate the typed confirmation word.
 *   2. Call the SECURITY DEFINER RPC `delete_my_account()` which removes
 *      the auth.users row for auth.uid(). FK cascades wipe profiles,
 *      daily_plans, activity_logs, user_badges, challenge_videos.
 *   3. Sign out (the JWT in the cookie now references a deleted user).
 *   4. Redirect home with ?deleted=1 so the landing page can flash a notice.
 */
export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const locale = pickLocale(formData.get('locale'));

  const parsed = deleteSchema.safeParse({ confirm: formData.get('confirm') });
  if (!parsed.success) {
    return { ok: false, error: 'confirmMismatch' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, error: 'unauthorized' };
  }

  const { error: rpcErr } = await supabase.rpc('delete_my_account');
  if (rpcErr) {
    console.error('[account/delete] rpc failed', rpcErr);
    return { ok: false, error: 'rpc' };
  }

  // Tear down the session cookie. Without this the user's browser would
  // still carry a JWT pointing at a row that no longer exists.
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect({ href: '/?deleted=1', locale });
  return { ok: true };
}
