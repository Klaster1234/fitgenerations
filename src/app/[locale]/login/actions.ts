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
  notice?: string;
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
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fgst.vercel.app';
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/${locale}/onboarding` },
  });
  if (error) {
    return { ok: false, error: 'invalidCredentials' };
  }

  return { ok: true, notice: 'checkEmail' };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect({ href: '/', locale: routing.defaultLocale });
}
