import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generatePlan, type Profile, type ExerciseCandidate } from './plan-generator';
import { buildBaselinePlan } from './baseline-plan';
import { getWeather, type WeatherSnapshot } from '@/lib/weather';

export type PlanItem = {
  exercise_slug: string;
  duration_minutes: number;
  ai_note: string;
  order: number;
};

export type DailyPlan = {
  id: string;
  user_id: string;
  plan_date: string;
  weather: WeatherSnapshot | null;
  items: PlanItem[];
  ai_summary: string | null;
  ai_model: string | null;
  created_at: string;
};

export type EnsurePlanResult =
  | { ok: true; plan: DailyPlan; cached: boolean; source: 'ai' | 'baseline' }
  | { ok: false; error: 'onboarding_required' | 'catalogue_unavailable' | 'save_failed' };

/**
 * Ensure today's plan exists for `userId`. Generates and persists when missing
 * (or when `regenerate` is true). Single source of truth — both the
 * `/api/plan` route and the `/plan` server component call this directly so
 * we don't have to forward auth cookies through a same-origin fetch.
 *
 * Falls back to a deterministic templated plan when ANTHROPIC_API_KEY is
 * missing or the AI call throws. The user always lands on a plan.
 */
export async function ensureTodayPlan(
  supabase: SupabaseClient,
  userId: string,
  options: { regenerate?: boolean } = {},
): Promise<EnsurePlanResult> {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Profile (also gates onboarding)
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('locale, age, fitness_level, equipment, goals, city')
    .eq('id', userId)
    .single();

  if (!profileRow || !profileRow.age || !profileRow.fitness_level) {
    return { ok: false, error: 'onboarding_required' };
  }
  const profile = profileRow as Profile;

  // 2. Reuse today's plan unless explicitly regenerating
  if (!options.regenerate) {
    const { data: existing } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .maybeSingle();
    if (existing) {
      return { ok: true, plan: existing as DailyPlan, cached: true, source: 'ai' };
    }
  }

  // 3. Weather + exercise catalogue in parallel
  const [weather, exercisesRes] = await Promise.all([
    getWeather(profile.city ?? ''),
    supabase
      .from('exercises')
      .select('slug, category, difficulty, name, duration_minutes, equipment, min_age, max_age'),
  ]);

  if (exercisesRes.error || !exercisesRes.data) {
    return { ok: false, error: 'catalogue_unavailable' };
  }

  // 4. Filter catalogue to what fits the user's equipment / age / level
  const userEquip = new Set(profile.equipment.length ? profile.equipment : ['none']);
  const allowedDifficulty: Record<Profile['fitness_level'], Set<string>> = {
    low: new Set(['low']),
    mid: new Set(['low', 'mid']),
    high: new Set(['low', 'mid', 'high']),
  };

  const catalogue: ExerciseCandidate[] = exercisesRes.data
    .filter((ex) => {
      const equipOk =
        ex.equipment.length === 0 || ex.equipment.every((e: string) => userEquip.has(e));
      const ageOk = profile.age >= ex.min_age && profile.age <= ex.max_age;
      const diffOk = allowedDifficulty[profile.fitness_level].has(ex.difficulty);
      return equipOk && ageOk && diffOk;
    })
    .map((ex) => ({
      slug: ex.slug,
      category: ex.category,
      difficulty: ex.difficulty,
      name:
        (ex.name as Record<string, string>)[profile.locale] ??
        (ex.name as Record<string, string>).en,
      duration_minutes: ex.duration_minutes,
      equipment: ex.equipment,
    }));

  if (catalogue.length < 3) {
    return { ok: false, error: 'catalogue_unavailable' };
  }

  // 5. Try AI; fall back to deterministic baseline on any failure (or no key)
  let aiPlan;
  let source: 'ai' | 'baseline' = 'baseline';
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      aiPlan = await generatePlan({ profile, weather, date: today, catalogue });
      source = 'ai';
    } catch (err) {
      console.error('[plan-service] AI generation failed, using baseline', err);
      aiPlan = buildBaselinePlan(catalogue, profile);
    }
  } else {
    aiPlan = buildBaselinePlan(catalogue, profile);
  }

  // 6. Persist (one row per user per day)
  const planRow = {
    user_id: userId,
    plan_date: today,
    weather: weather as unknown as Record<string, unknown> | null,
    items: aiPlan.items,
    ai_summary: `${aiPlan.greeting}\n\n${aiPlan.motivation}`,
    ai_model:
      source === 'ai' ? process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7' : 'baseline-template',
  };

  const { data: saved, error: saveErr } = await supabase
    .from('daily_plans')
    .upsert(planRow, { onConflict: 'user_id,plan_date' })
    .select()
    .single();

  if (saveErr) {
    console.error('[plan-service] save failed', saveErr);
    return { ok: false, error: 'save_failed' };
  }

  return { ok: true, plan: saved as DailyPlan, cached: false, source };
}
