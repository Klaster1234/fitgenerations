import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type GroupStats = {
  member_count: number;
  total_workouts: number;
  active_today: number;
};

export default async function GroupPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code: rawCode } = await params;
  setRequestLocale(locale);

  // Normalize the code from the URL so /group/abc123 and /group/ABC123 resolve
  // to the same group. The DB constraint stores them upper-cased.
  const code = rawCode.toUpperCase();

  const supabase = await createSupabaseServerClient();
  const t = await getTranslations('Group');

  let stats: GroupStats = { member_count: 0, total_workouts: 0, active_today: 0 };
  const valid = /^[A-Z0-9]{4,12}$/.test(code);

  if (valid) {
    const { data } = await supabase.rpc('get_group_stats', { p_code: code });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      stats = {
        member_count: Number(row.member_count ?? 0),
        total_workouts: Number(row.total_workouts ?? 0),
        active_today: Number(row.active_today ?? 0),
      };
    }
  }

  // Coach-defined club session attached to this code (migration 0032). Shown
  // above the live stats so a player who enters the code sees the real training
  // session, not just numbers. Independent of the AI daily plan.
  type SessionItem = {
    position: number;
    name: Record<string, string>;
    duration_minutes: number;
    video_url: string | null;
  };
  let sessionItems: SessionItem[] = [];
  if (valid) {
    const { data: sessionData } = await supabase
      .from('group_session_items')
      .select('position, name, duration_minutes, video_url')
      .eq('group_code', code)
      .order('position');
    sessionItems = (sessionData ?? []) as SessionItem[];
  }
  const sessionTotal = sessionItems.reduce((sum, it) => sum + it.duration_minutes, 0);

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <header className="text-center mb-8">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-brand mb-3">
            {t('eyebrow')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t('title', { code })}
          </h1>
          {!valid && (
            <p className="mt-4 text-base text-danger" role="alert">
              {t('invalidCode')}
            </p>
          )}
        </header>

        {sessionItems.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{t('sessionTitle')}</h2>
                <p className="mt-1 text-sm text-muted">{t('sessionLede')}</p>
              </div>
              <p className="shrink-0 text-sm font-medium text-muted">
                {t('sessionTotal', { minutes: sessionTotal })}
              </p>
            </div>
            <ol className="space-y-3">
              {sessionItems.map((item, idx) => {
                const name = item.name?.[locale] ?? item.name?.en ?? '';
                return (
                  <li key={item.position}>
                    <Card>
                      <CardContent className="flex items-center gap-4 p-4">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand-darker"
                          aria-hidden
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug">{name}</p>
                          <p className="mt-0.5 text-sm text-muted">
                            {t('sessionMinutes', { minutes: item.duration_minutes })}
                          </p>
                        </div>
                        {item.video_url && (
                          <a
                            href={item.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-12 shrink-0 items-center gap-1 px-2 text-base font-semibold text-brand underline hover:text-brand-dark"
                          >
                            <span aria-hidden>▸</span>
                            <span>{t('sessionVideo')}</span>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {valid && stats.member_count === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted">
              <p className="text-lg">{t('empty')}</p>
              <p className="mt-3 text-base">{t('emptyHint', { code })}</p>
            </CardContent>
          </Card>
        ) : valid ? (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-4xl font-bold text-brand">{stats.member_count}</p>
                <p className="mt-1 text-sm text-muted">{t('members')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-4xl font-bold text-brand">{stats.total_workouts}</p>
                <p className="mt-1 text-sm text-muted">{t('totalWorkouts')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-4xl font-bold text-brand">{stats.active_today}</p>
                <p className="mt-1 text-sm text-muted">{t('activeToday')}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">{t('howTitle')}</h2>
          <ol className="mt-4 space-y-3 text-base leading-relaxed list-decimal pl-5">
            <li>{t('howStep1')}</li>
            <li>{t('howStep2', { code })}</li>
            <li>{t('howStep3')}</li>
          </ol>
        </section>
      </main>
    </>
  );
}
