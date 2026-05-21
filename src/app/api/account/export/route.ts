import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/account/export
 *
 * GDPR data-portability endpoint. Returns a JSON file with everything the
 * app stores about the caller across user-owned tables. The route handler
 * (rather than a Server Action) is used so we can set the right
 * Content-Disposition header and have the browser trigger a download.
 *
 * RLS does the security work: every `select` below scopes to auth.uid() by
 * default. We don't query the exercises / badges catalog tables - those are
 * public reference data, not personal data.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user || userData.user.is_anonymous) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = userData.user.id;

  // Parallel reads. Each query is filtered by RLS, but we also add an
  // explicit `eq('user_id', userId)` for tables where the user_id column
  // exists - defence in depth and clearer intent for code review.
  const [profile, plans, logs, videos, badges] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('daily_plans').select('*').eq('user_id', userId),
    supabase.from('activity_logs').select('*').eq('user_id', userId),
    supabase.from('challenge_videos').select('*').eq('user_id', userId),
    supabase.from('user_badges').select('*').eq('user_id', userId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: {
      id: userId,
      email: userData.user.email ?? null,
      created_at: userData.user.created_at,
    },
    profile: profile.data ?? null,
    daily_plans: plans.data ?? [],
    activity_logs: logs.data ?? [],
    challenge_videos: videos.data ?? [],
    user_badges: badges.data ?? [],
  };

  const today = new Date().toISOString().slice(0, 10);
  const filename = `fgst-export-${today}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Personal data - never cache.
      'Cache-Control': 'no-store',
    },
  });
}
