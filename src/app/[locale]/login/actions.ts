'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signupSchema = credentialsSchema.extend({
  // Optional: when the visitor ticks "I'm a trainer" on the signup form
  // we flip their profiles.role to 'trainer' so they unlock the /trainer
  // dashboard. Empty / unchecked = stays default 'participant'.
  is_trainer: z.union([z.literal('true'), z.literal('on'), z.literal(''), z.null()]).optional(),
});

type AuthState = {
  ok: boolean;
  // Specific error codes so the UI can show actionable messages
  // ("account already exists, log in" vs generic "wrong credentials").
  error?:
    | 'invalidCredentials'      // Zod or other validation failed
    | 'wrongPassword'           // login: email exists but password wrong
    | 'accountNotFound'         // login: email not in DB
    | 'userAlreadyExists'       // signup: email already registered (very common)
    | 'weakPassword'            // signup: password too short / weak
    | 'emailNotConfirmed'       // signup: confirmation email pending
    | 'rateLimited'             // too many attempts
    | 'serverError';            // unexpected
};

/**
 * Map a Supabase auth error to a stable client-facing code.
 * Falls back to 'invalidCredentials' so we never leak Supabase internals.
 */
function mapAuthError(
  err: { code?: string; message?: string; status?: number } | null | undefined,
  fallback: AuthState['error'] = 'invalidCredentials',
): NonNullable<AuthState['error']> {
  if (!err) return fallback;
  const code = err.code ?? '';
  const msg = (err.message ?? '').toLowerCase();

  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('user already')) {
    return 'userAlreadyExists';
  }
  if (code === 'weak_password' || msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'weakPassword';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'emailNotConfirmed';
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'wrongPassword';
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || (err.status ?? 0) === 429) {
    return 'rateLimited';
  }
  if ((err.status ?? 0) >= 500) {
    return 'serverError';
  }
  return fallback;
}

function pickLocale(value: FormDataEntryValue | null): Locale {
  if (typeof value === 'string' && (routing.locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return routing.defaultLocale;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = pickLocale(formData.get('locale'));
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'invalidCredentials' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, error: mapAuthError(error, 'wrongPassword') };
  }

  revalidatePath('/', 'layout');
  redirect({ href: '/plan', locale });
  // Unreachable - `redirect` throws. Satisfies the explicit return type.
  return { ok: true };
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = pickLocale(formData.get('locale'));
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    is_trainer: formData.get('is_trainer'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'invalidCredentials' };
  }

  // Checkbox returns 'on' (default) or 'true' (if value="true") when ticked.
  // Empty / null = unticked = participant.
  const isTrainer = parsed.data.is_trainer === 'on' || parsed.data.is_trainer === 'true';

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.auth.getUser();

  // If the visitor already has an anonymous session (proxy.ts created
  // one when they opened /plan etc.), upgrade it instead of creating
  // a new account. This preserves their plan + history + badges +
  // streak across the conversion to a permanent account.
  if (existing.user && existing.user.is_anonymous) {
    const { error: updateErr } = await supabase.auth.updateUser({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (updateErr) {
      console.error('[signup] anonymous upgrade failed', updateErr);
      return { ok: false, error: mapAuthError(updateErr, 'userAlreadyExists') };
    }
    if (isTrainer) {
      await supabase
        .from('profiles')
        .update({ role: 'trainer' })
        .eq('id', existing.user.id);
    }
    revalidatePath('/', 'layout');
    redirect({ href: isTrainer ? '/trainer' : '/plan', locale });
    return { ok: true };
  }

  // No session yet - create a fresh account. Email confirmation is
  // disabled (mailer_autoconfirm=true) so signUp returns a session
  // immediately. Redirect to /plan; onboarding is opt-in from there.
  const { data: signupData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, error: mapAuthError(error, 'userAlreadyExists') };
  }

  if (isTrainer && signupData.user) {
    await supabase
      .from('profiles')
      .update({ role: 'trainer' })
      .eq('id', signupData.user.id);
  }

  revalidatePath('/', 'layout');
  redirect({ href: isTrainer ? '/trainer' : '/plan', locale });
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect({ href: '/', locale: routing.defaultLocale });
}
