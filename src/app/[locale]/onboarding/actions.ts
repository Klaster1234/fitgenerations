'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const profileSchema = z.object({
  age: z.coerce.number().int().min(6).max(120),
  fitness_level: z.enum(['low', 'mid', 'high']),
  equipment: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  city: z.string().min(1).max(80),
});

type SaveState = { ok: boolean; error?: string };

function pickLocale(value: FormDataEntryValue | null): Locale {
  if (typeof value === 'string' && (routing.locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return routing.defaultLocale;
}

export async function saveOnboarding(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const locale = pickLocale(formData.get('locale'));

  const parsed = profileSchema.safeParse({
    age: formData.get('age'),
    fitness_level: formData.get('fitness_level'),
    equipment: formData.getAll('equipment'),
    goals: formData.getAll('goals'),
    city: formData.get('city'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, error: 'unauthorized' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ...parsed.data,
      locale,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', userData.user.id);

  if (error) {
    return { ok: false, error: 'db' };
  }

  revalidatePath('/', 'layout');
  redirect({ href: '/plan', locale });
  // Unreachable — `redirect` throws. Satisfies the explicit return type.
  return { ok: true };
}
