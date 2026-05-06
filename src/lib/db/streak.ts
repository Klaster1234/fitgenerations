import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Counts consecutive days (today or yesterday backwards) the user has at least
 * one activity_log entry for. Returns 0 if no log today AND no log yesterday.
 */
export async function getStreak(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  // Pull last 60 distinct days — plenty for the longest realistic streak.
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data, error } = await supabase
    .from('activity_logs')
    .select('log_date')
    .eq('user_id', userId)
    .gte('log_date', sixtyDaysAgo.toISOString().slice(0, 10))
    .order('log_date', { ascending: false });

  if (error || !data || data.length === 0) return 0;

  const days = new Set(data.map((r) => r.log_date as string));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Allow streak to remain valid if user hasn't logged today yet — start from yesterday.
  const cursor = new Date(today);
  if (!days.has(toDateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(toDateStr(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toDateStr(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Total number of activity logs (used for milestone badges). */
export async function getTotalLogs(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
