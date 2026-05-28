'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const createGroupSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z0-9]{4,12}$/.test(v), 'invalidCode'),
  name: z.string().trim().min(1).max(80),
  city: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  sport: z.enum(['general', 'football']).default('general'),
});

export type CreateGroupState = {
  ok: boolean;
  error?: 'invalidCode' | 'codeTaken' | 'notTrainer' | 'unauthorized' | 'db';
};

function pickLocale(value: FormDataEntryValue | null): Locale {
  if (typeof value === 'string' && (routing.locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return routing.defaultLocale;
}

export async function createGroupAction(
  _prev: CreateGroupState,
  formData: FormData,
): Promise<CreateGroupState> {
  const locale = pickLocale(formData.get('locale'));

  const sportRaw = formData.get('sport');
  const sport =
    typeof sportRaw === 'string' && ['general', 'football'].includes(sportRaw)
      ? sportRaw
      : 'general';

  const parsed = createGroupSchema.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
    city: formData.get('city') ?? undefined,
    sport,
  });
  if (!parsed.success) {
    return { ok: false, error: 'invalidCode' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, error: 'unauthorized' };
  }

  // Re-check role server-side - never trust the client.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profile?.role !== 'trainer') {
    return { ok: false, error: 'notTrainer' };
  }

  const { error } = await supabase.from('groups').insert({
    code: parsed.data.code,
    name: parsed.data.name,
    city: parsed.data.city,
    sport: parsed.data.sport,
    owner_id: userData.user.id,
  });

  if (error) {
    // Unique constraint on code = someone else already owns this code.
    if (error.code === '23505') {
      return { ok: false, error: 'codeTaken' };
    }
    console.error('[trainer/new] insert failed', error);
    return { ok: false, error: 'db' };
  }

  revalidatePath('/[locale]/trainer', 'page');
  redirect({ href: `/group/${parsed.data.code}`, locale });
  return { ok: true };
}
