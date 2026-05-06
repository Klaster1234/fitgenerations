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

type AuthState = {
  ok: boolean;
  error?: string;
};

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
    return { ok: false, error: 'invalidCredentials' };
  }

  revalidatePath('/', 'layout');
  redirect({ href: '/plan', locale });
  // Unreachable — `redirect` throws. Satisfies the explicit return type.
  return { ok: true };
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = pickLocale(formData.get('locale'));
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'invalidCredentials' };
  }

  const supabase = await createSupabaseServerClient();
  // Email confirmation is disabled in Supabase (mailer_autoconfirm=true),
  // so signUp returns a session immediately — no email link, no friction.
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return { ok: false, error: 'invalidCredentials' };
  }

  revalidatePath('/', 'layout');
  redirect({ href: '/onboarding', locale });
  // Unreachable — `redirect` throws.
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect({ href: '/', locale: routing.defaultLocale });
}
