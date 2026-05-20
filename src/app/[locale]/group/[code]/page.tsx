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
