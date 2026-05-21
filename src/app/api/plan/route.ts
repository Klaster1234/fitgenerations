import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureTodayPlan } from '@/lib/ai/plan-service';

/**
 * POST /api/plan
 *
 * Used by the client-side "Regenerate" button. The page itself calls
 * ensureTodayPlan directly - it doesn't need this route handler.
 *
 * Body: optional `{ regenerate?: boolean }` - when true, replaces today's plan.
 *
 * Rate limit: a single user can regenerate at most once per REGEN_COOLDOWN_MS
 * (60s). Without this, an authenticated visitor - including the auto-provisioned
 * anonymous sessions created by proxy.ts - could spam regenerate and burn the
 * Anthropic budget. We piggyback on daily_plans.updated_at (added in 0009)
 * rather than a dedicated rate_limits table.
 */

const REGEN_COOLDOWN_MS = 60_000;

const bodySchema = z.object({
  regenerate: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (parsed.data.regenerate) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from('daily_plans')
      .select('updated_at')
      .eq('user_id', userData.user.id)
      .eq('plan_date', today)
      .maybeSingle();

    if (existing?.updated_at) {
      const sinceLastMs = Date.now() - new Date(existing.updated_at).getTime();
      if (sinceLastMs < REGEN_COOLDOWN_MS) {
        const retryAfter = Math.ceil((REGEN_COOLDOWN_MS - sinceLastMs) / 1000);
        return NextResponse.json(
          { error: 'rate_limited', retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } },
        );
      }
    }
  }

  const result = await ensureTodayPlan(supabase, userData.user.id, {
    regenerate: parsed.data.regenerate,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    plan: result.plan,
    cached: result.cached,
    source: result.source,
  });
}
