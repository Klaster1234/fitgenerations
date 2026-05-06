import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureTodayPlan } from '@/lib/ai/plan-service';

/**
 * POST /api/plan
 *
 * Used by the client-side "Regenerate" button. The page itself calls
 * ensureTodayPlan directly — it doesn't need this route handler.
 *
 * Body: optional `{ regenerate?: boolean }` — when true, replaces today's plan.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { regenerate?: boolean };

  const result = await ensureTodayPlan(supabase, userData.user.id, {
    regenerate: body.regenerate,
  });

  if (!result.ok) {
    const status = result.error === 'onboarding_required' ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    plan: result.plan,
    cached: result.cached,
    source: result.source,
  });
}
