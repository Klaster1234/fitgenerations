'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const profileSchema = z.object({
  age: z.coerce.number().int().min(6).max(120),
  fitness_level: z.enum(['low', 'mid', 'high']),
  interests: z.array(z.enum(['fitness', 'football', 'green'])).default([]),
  equipment: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  city: z.string().min(1).max(80),
  // Wizard step 6: pair / group. Both default to "no partner / no group" so
  // existing onboarding payloads (and the /api/plan regenerate flow) stay
  // backwards-compatible. Zod 4 propagates the post-transform type into
  // .default, so we put the default BEFORE the transform.
  trains_with_partner: z
    .union([z.literal('yes'), z.literal('no')])
    .default('no')
    .transform((v) => v === 'yes'),
  group_code: z
    .string()
    .trim()
    .default('')
    .transform((v) => v.toUpperCase())
    .refine((v) => v === '' || /^[A-Z0-9]{4,12}$/.test(v), 'invalid_group_code')
    .transform((v) => (v === '' ? null : v)),
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
    interests: formData.getAll('interests'),
    equipment: formData.getAll('equipment'),
    goals: formData.getAll('goals'),
    city: formData.get('city'),
    trains_with_partner: formData.get('trains_with_partner') ?? undefined,
    group_code: formData.get('group_code') ?? '',
  });
  if (!parsed.success) {
    console.error('[onboarding] zod validation failed', parsed.error.flatten());
    return { ok: false, error: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, error: 'unauthorized' };
  }

  // Upsert (not update) - resilient if the trigger-created row got removed
  // or if the user's profile was wiped during testing.
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userData.user.id,
        ...parsed.data,
        locale,
        onboarded_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (error) {
    console.error('[onboarding] supabase upsert failed', error);
    return { ok: false, error: 'db' };
  }

  // When this form is used to EDIT an existing profile (the wizard also lives
  // on the settings page), today's cached plan would otherwise survive the
  // change - ensureTodayPlan only regenerates on a locale mismatch or explicit
  // regenerate. Drop today's plan so it rebuilds with the new age / fitness /
  // equipment / city / interests on the next /plan load. No-op for first-time
  // onboarding (no plan exists yet).
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from('daily_plans')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('plan_date', today);

  revalidatePath('/', 'layout');
  redirect({ href: '/plan', locale });
  // Unreachable - `redirect` throws. Satisfies the explicit return type.
  return { ok: true };
}
