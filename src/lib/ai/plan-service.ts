import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generatePlan, type Profile, type ExerciseCandidate } from './plan-generator';
import { buildBaselinePlan } from './baseline-plan';
import { getWeather, type WeatherSnapshot } from '@/lib/weather';

// Runtime schemas for what we read from Supabase. Until we move to
// `supabase gen types typescript`, these protect the AI pipeline from
// surprises like a `fitness_level = 'foo'` row sneaking past the type
// system and crashing `allowedDifficulty[profile.fitness_level]` with an
// undefined.has(...) error downstream.

const profileRowSchema = z.object({
  locale: z.enum(['en', 'pl', 'it', 'uk']).nullable().optional(),
  age: z.number().int().min(6).max(120).nullable().optional(),
  fitness_level: z.enum(['low', 'mid', 'high']).nullable().optional(),
  equipment: z.array(z.string()).nullable().optional(),
  goals: z.array(z.string()).nullable().optional(),
  city: z.string().nullable().optional(),
  trains_with_partner: z.boolean().nullable().optional(),
  role: z.enum(['participant', 'trainer']).nullable().optional(),
});

const exerciseRowSchema = z.object({
  slug: z.string(),
  category: z.string(),
  difficulty: z.enum(['low', 'mid', 'high']),
  name: z.record(z.string(), z.string()),
  duration_minutes: z.number().int().min(1).max(60),
  equipment: z.array(z.string()),
  min_age: z.number().int(),
  max_age: z.number().int(),
});

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
  // Locale the plan was generated in (en/pl/it/uk). When the user switches
  // language in the locale switcher, we compare this against the request
  // locale and regenerate if they differ so the AI greeting + ai_note
  // copy is in the right language. Added in migration 0008.
  locale: Profile['locale'];
  created_at: string;
};

export type EnsurePlanResult =
  | { ok: true; plan: DailyPlan; cached: boolean; source: 'ai' | 'baseline' }
  | { ok: false; error: 'catalogue_unavailable' | 'save_failed' };

/**
 * Ensure today's plan exists for `userId`. Generates and persists when missing
 * (or when `regenerate` is true). Single source of truth - both the
 * `/api/plan` route and the `/plan` server component call this directly so
 * we don't have to forward auth cookies through a same-origin fetch.
 *
 * Falls back to a deterministic templated plan when ANTHROPIC_API_KEY is
 * missing or the AI call throws. The user always lands on a plan.
 */
export async function ensureTodayPlan(
  supabase: SupabaseClient,
  userId: string,
  options: { regenerate?: boolean; locale?: Profile['locale'] } = {},
): Promise<EnsurePlanResult> {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Profile - falls back to sensible defaults when the user hasn't
  // gone through onboarding yet, so the plan is generated immediately on
  // first visit. They can personalize later via /onboarding. The fallback
  // locale comes from the request URL (passed by the caller) so an
  // anonymous user landing on /uk doesn't get an English plan.
  const { data: rawProfileRow } = await supabase
    .from('profiles')
    .select('locale, age, fitness_level, equipment, goals, city, trains_with_partner, role')
    .eq('id', userId)
    .single();

  // Validate at runtime so a malformed row (rare, but possible on legacy
  // data or post-migration) cannot crash the AI pipeline downstream.
  const profileRow = rawProfileRow ? profileRowSchema.parse(rawProfileRow) : null;

  const profile: Profile = {
    // Priority: URL locale (passed via options) > stored profile.locale > 'en'.
    // URL wins because the user is *currently viewing* in that language - if
    // they flipped the locale switcher to Italian we want the next plan in
    // Italian, not whatever was saved during onboarding.
    locale: options.locale ?? profileRow?.locale ?? 'en',
    age: profileRow?.age ?? 40,
    fitness_level: profileRow?.fitness_level ?? 'mid',
    equipment: profileRow?.equipment ?? [],
    goals: profileRow?.goals ?? [],
    city: profileRow?.city ?? null,
    trains_with_partner: profileRow?.trains_with_partner ?? false,
    role: profileRow?.role ?? 'participant',
  };

  // 2. Reuse today's plan unless we're forced to regenerate OR the cached
  // plan is in a different language than what the user is now viewing.
  // Switching the locale switcher should make the AI greeting + motivation +
  // ai_note land in the new language, not stay stuck in the old one.
  if (!options.regenerate) {
    const { data: existing } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .maybeSingle();
    if (existing) {
      const cached = existing as DailyPlan;
      const sameLocale = cached.locale === profile.locale;
      if (sameLocale) {
        return { ok: true, plan: cached, cached: true, source: 'ai' };
      }
      // Fall through to regeneration. The upsert at the end will replace
      // this row (same user_id + plan_date key).
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

  // Validate the catalogue rows up front. Drop any row that doesn't match
  // the schema rather than crashing - a single malformed exercise should
  // not block today's plan for the user.
  const validatedRows = exercisesRes.data
    .map((row) => {
      const parsed = exerciseRowSchema.safeParse(row);
      return parsed.success ? parsed.data : null;
    })
    .filter((row): row is z.infer<typeof exerciseRowSchema> => row !== null);

  const catalogue: ExerciseCandidate[] = validatedRows
    .filter((ex) => {
      const equipOk =
        ex.equipment.length === 0 || ex.equipment.every((e) => userEquip.has(e));
      const ageOk = profile.age >= ex.min_age && profile.age <= ex.max_age;
      const diffOk = allowedDifficulty[profile.fitness_level].has(ex.difficulty);
      return equipOk && ageOk && diffOk;
    })
    .map((ex) => ({
      slug: ex.slug,
      category: ex.category,
      difficulty: ex.difficulty,
      name: ex.name[profile.locale] ?? ex.name.en ?? ex.slug,
      duration_minutes: ex.duration_minutes,
      equipment: ex.equipment,
    }));

  if (catalogue.length < 3) {
    return { ok: false, error: 'catalogue_unavailable' };
  }

  // 5. Try AI; fall back to deterministic baseline on any failure (or no key)
  let aiPlan;
  let source: 'ai' | 'baseline' = 'baseline';
  if (process.env.GROQ_API_KEY) {
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

  // 6. Persist (one row per user per day). The `locale` stamp lets us
  // invalidate the cache when the user switches languages.
  const planRow = {
    user_id: userId,
    plan_date: today,
    weather: weather as unknown as Record<string, unknown> | null,
    items: aiPlan.items,
    ai_summary: `${aiPlan.greeting}\n\n${aiPlan.motivation}`,
    ai_model:
      source === 'ai' ? process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b' : 'baseline-template',
    locale: profile.locale,
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
