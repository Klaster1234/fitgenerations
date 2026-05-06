import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWeather } from '@/lib/weather';
import { generatePlan, type Profile, type ExerciseCandidate } from '@/lib/ai/plan-generator';

/**
 * POST /api/plan
 * Generates a fresh daily plan for the authenticated user and persists it.
 * Body: optional `{ regenerate?: boolean }` — when true, replaces today's plan.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { regenerate?: boolean };
  const userId = userData.user.id;
  const today = new Date().toISOString().slice(0, 10);

  // 1. Load profile
  const { data: profileRow, error: profileErr } = await supabase
    .from('profiles')
    .select('locale, age, fitness_level, equipment, goals, city')
    .eq('id', userId)
    .single();
  if (profileErr || !profileRow || !profileRow.age || !profileRow.fitness_level) {
    return NextResponse.json({ error: 'onboarding_required' }, { status: 400 });
  }
  const profile = profileRow as Profile;

  // 2. Reuse today's plan if it exists and we're not regenerating
  if (!body.regenerate) {
    const { data: existing } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ plan: existing, cached: true });
    }
  }

  // 3. Fetch weather + exercise catalogue in parallel
  const [weather, exercisesRes] = await Promise.all([
    getWeather(profile.city ?? ''),
    supabase
      .from('exercises')
      .select('slug, category, difficulty, name, duration_minutes, equipment, min_age, max_age'),
  ]);

  if (exercisesRes.error || !exercisesRes.data) {
    return NextResponse.json({ error: 'catalogue_unavailable' }, { status: 500 });
  }

  // 4. Filter catalogue: equipment match, age range, difficulty matches level (or below)
  const userEquip = new Set(profile.equipment.length ? profile.equipment : ['none']);
  const allowedDifficulty: Record<Profile['fitness_level'], Set<string>> = {
    low: new Set(['low']),
    mid: new Set(['low', 'mid']),
    high: new Set(['low', 'mid', 'high']),
  };

  const catalogue: ExerciseCandidate[] = exercisesRes.data
    .filter((ex) => {
      const equipOk = ex.equipment.length === 0 || ex.equipment.every((e: string) => userEquip.has(e));
      const ageOk = profile.age >= ex.min_age && profile.age <= ex.max_age;
      const diffOk = allowedDifficulty[profile.fitness_level].has(ex.difficulty);
      return equipOk && ageOk && diffOk;
    })
    .map((ex) => ({
      slug: ex.slug,
      category: ex.category,
      difficulty: ex.difficulty,
      name: (ex.name as Record<string, string>)[profile.locale] ?? (ex.name as Record<string, string>).en,
      duration_minutes: ex.duration_minutes,
      equipment: ex.equipment,
    }));

  if (catalogue.length < 3) {
    return NextResponse.json({ error: 'not_enough_exercises' }, { status: 500 });
  }

  // 5. Ask Claude
  let aiPlan;
  try {
    aiPlan = await generatePlan({ profile, weather, date: today, catalogue });
  } catch (err) {
    console.error('plan-generator failed', err);
    return NextResponse.json({ error: 'ai_error' }, { status: 502 });
  }

  // 6. Persist (upsert on user_id+plan_date)
  const planRow = {
    user_id: userId,
    plan_date: today,
    weather: weather as unknown as Record<string, unknown> | null,
    items: aiPlan.items,
    ai_summary: `${aiPlan.greeting}\n\n${aiPlan.motivation}`,
    ai_model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7',
  };
  const { data: saved, error: saveErr } = await supabase
    .from('daily_plans')
    .upsert(planRow, { onConflict: 'user_id,plan_date' })
    .select()
    .single();

  if (saveErr) {
    console.error('save plan failed', saveErr);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ plan: saved, cached: false });
}
