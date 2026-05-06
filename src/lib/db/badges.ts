import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStreak, getTotalLogs } from './streak';

type BadgeRow = {
  id: string;
  slug: string;
  criteria: { type: string; min?: number; category?: string };
};

/**
 * Checks every badge the user does NOT yet have, awards any whose criteria
 * are now met. Returns the slugs of newly earned badges so the UI can
 * celebrate them.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: allBadges }, { data: ownedRows }] = await Promise.all([
    supabase.from('badges').select('id, slug, criteria'),
    supabase.from('user_badges').select('badge_id').eq('user_id', userId),
  ]);
  if (!allBadges) return [];

  const ownedIds = new Set((ownedRows ?? []).map((r) => r.badge_id));
  const candidates = (allBadges as BadgeRow[]).filter((b) => !ownedIds.has(b.id));
  if (candidates.length === 0) return [];

  // Pre-compute stats once.
  const [streak, totalLogs, distinctCategories] = await Promise.all([
    getStreak(userId),
    getTotalLogs(userId),
    getDistinctCategories(userId),
  ]);

  const earned: BadgeRow[] = [];
  for (const badge of candidates) {
    const c = badge.criteria;
    if (c.type === 'streak' && streak >= (c.min ?? 0)) earned.push(badge);
    else if (c.type === 'logs_count' && totalLogs >= (c.min ?? 0)) earned.push(badge);
    else if (c.type === 'diverse_categories' && distinctCategories.size >= (c.min ?? 0))
      earned.push(badge);
    else if (c.type === 'category' && c.category && distinctCategories.has(c.category))
      earned.push(badge);
  }

  if (earned.length === 0) return [];

  await supabase
    .from('user_badges')
    .insert(earned.map((b) => ({ user_id: userId, badge_id: b.id })));

  return earned.map((b) => b.slug);
}

async function getDistinctCategories(userId: string): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('activity_logs')
    .select('exercises:exercise_id(category)')
    .eq('user_id', userId);

  const cats = new Set<string>();
  type Row = { exercises: { category: string } | { category: string }[] | null };
  for (const row of (data as Row[] | null) ?? []) {
    if (!row.exercises) continue;
    if (Array.isArray(row.exercises)) {
      for (const e of row.exercises) cats.add(e.category);
    } else {
      cats.add(row.exercises.category);
    }
  }
  return cats;
}
