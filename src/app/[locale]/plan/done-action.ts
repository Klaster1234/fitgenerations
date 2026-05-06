'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkAndAwardBadges } from '@/lib/db/badges';

const inputSchema = z.object({
  exercise_slug: z.string().min(1),
  plan_id: z.string().uuid(),
  duration_minutes: z.coerce.number().int().min(1).max(120),
});

export type MarkDoneState = {
  ok: boolean;
  earned?: string[]; // newly earned badge slugs
  error?: string;
};

export async function markExerciseDone(
  _prev: MarkDoneState,
  formData: FormData,
): Promise<MarkDoneState> {
  const parsed = inputSchema.safeParse({
    exercise_slug: formData.get('exercise_slug'),
    plan_id: formData.get('plan_id'),
    duration_minutes: formData.get('duration_minutes'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'unauthorized' };

  // Look up exercise UUID by slug.
  const { data: exercise } = await supabase
    .from('exercises')
    .select('id')
    .eq('slug', parsed.data.exercise_slug)
    .single();
  if (!exercise) return { ok: false, error: 'unknown_exercise' };

  // Insert activity log.
  const { error: insertErr } = await supabase.from('activity_logs').insert({
    user_id: userData.user.id,
    plan_id: parsed.data.plan_id,
    exercise_id: exercise.id,
    duration_minutes: parsed.data.duration_minutes,
  });
  if (insertErr) {
    console.error('activity_log insert failed', insertErr);
    return { ok: false, error: 'db' };
  }

  // Auto-award any newly earned badges.
  const earned = await checkAndAwardBadges(userData.user.id);

  revalidatePath('/[locale]/plan', 'page');
  revalidatePath('/[locale]/history', 'page');
  revalidatePath('/[locale]/badges', 'page');

  return { ok: true, earned };
}
