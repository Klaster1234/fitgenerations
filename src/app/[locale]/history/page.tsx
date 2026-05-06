import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getStreak, getTotalLogs } from '@/lib/db/streak';

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect({ href: '/login', locale });
  }
  const userId = userData.user!.id;

  // Last 30 days of logs
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const sinceStr = since.toISOString().slice(0, 10);

  const [logsRes, streak, total] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('log_date, duration_minutes, exercises:exercise_id(slug, name, category)')
      .eq('user_id', userId)
      .gte('log_date', sinceStr)
      .order('log_date', { ascending: false }),
    getStreak(userId),
    getTotalLogs(userId),
  ]);

  type Row = {
    log_date: string;
    duration_minutes: number | null;
    exercises:
      | { slug: string; name: Record<string, string>; category: string }
      | { slug: string; name: Record<string, string>; category: string }[]
      | null;
  };
  const logs = (logsRes.data as Row[] | null) ?? [];

  // Group by date.
  const byDate = new Map<string, { name: string; minutes: number }[]>();
  for (const log of logs) {
    if (!log.exercises) continue;
    const ex = Array.isArray(log.exercises) ? log.exercises[0] : log.exercises;
    if (!ex) continue;
    const name = ex.name[locale] ?? ex.name.en ?? ex.slug;
    const arr = byDate.get(log.log_date) ?? [];
    arr.push({ name, minutes: log.duration_minutes ?? 0 });
    byDate.set(log.log_date, arr);
  }

  // Build 30-day grid (newest first)
  const days: { date: string; entries: { name: string; minutes: number }[] }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, entries: byDate.get(key) ?? [] });
  }

  const t = await getTranslations('History');

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-brand">{streak}</p>
            <p className="text-sm text-muted mt-1">{t('streak')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-brand">{total}</p>
            <p className="text-sm text-muted mt-1">{t('totalWorkouts')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-brand">
              {days.filter((d) => d.entries.length > 0).length}
            </p>
            <p className="text-sm text-muted mt-1">{t('activeDays')}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-8 text-xl font-semibold">{t('last30days')}</h2>
      {/* Audit fix: empty squares now use foreground/15 (visible in dark
          mode) instead of bg-border (~1.3:1). Filled steps go from soft
          green to bright green. Hover label exposes the date for screen
          readers and tooltips. */}
      <div className="mt-3 grid grid-cols-10 gap-1.5">
        {days.map((d) => {
          const intensity = Math.min(d.entries.length, 4);
          const tints = [
            'bg-foreground/15 dark:bg-foreground/20',
            'bg-emerald-300 dark:bg-emerald-700',
            'bg-emerald-400 dark:bg-emerald-600',
            'bg-emerald-500 dark:bg-emerald-500',
            'bg-emerald-600 dark:bg-emerald-400',
          ];
          return (
            <div
              key={d.date}
              className={`aspect-square rounded-md ${tints[intensity]} ring-1 ring-foreground/10 dark:ring-foreground/15`}
              title={`${d.date}: ${d.entries.length}`}
              aria-label={`${d.date}: ${d.entries.length} ${t('workouts')}`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-sm text-muted">
        {days[days.length - 1].date} → {days[0].date}
      </p>

      <h2 className="mt-8 text-xl font-semibold">{t('recent')}</h2>
      <ul className="mt-3 space-y-2">
        {days
          .filter((d) => d.entries.length > 0)
          .slice(0, 14)
          .map((d) => (
            <li key={d.date}>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-muted">{d.date}</p>
                  <ul className="mt-1 text-base">
                    {d.entries.map((e, i) => (
                      <li key={i}>
                        ✓ {e.name} {e.minutes ? `· ${e.minutes} min` : ''}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        {logs.length === 0 && (
          <li className="text-muted text-base py-6 text-center">{t('empty')}</li>
        )}
      </ul>
      </main>
    </>
  );
}
