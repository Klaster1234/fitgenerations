import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SURVEY_TYPES } from '../questions';

// Live, public response counters so partners can monitor participation
// without any account or dashboard access. Counts only — the SECURITY
// DEFINER RPC never exposes the answers themselves.

type CountRow = { survey: string; locale: string; responses: number };

export const dynamic = 'force-dynamic';

export default async function SurveyStatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Survey');

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc('survey_counts');
  const rows: CountRow[] = Array.isArray(data) ? data : [];

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <header className="mb-8 text-center">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-brand mb-3">
            {t('eyebrow')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t('statsTitle')}
          </h1>
          <p className="mt-4 text-base text-muted">{t('statsIntro')}</p>
        </header>

        <div className="space-y-4">
          {SURVEY_TYPES.map((survey) => {
            const surveyRows = rows.filter((row) => row.survey === survey);
            const total = surveyRows.reduce((sum, row) => sum + Number(row.responses), 0);
            return (
              <Card key={survey}>
                <CardContent className="p-6 flex items-center gap-4">
                  <p className="text-4xl font-bold text-brand min-w-16 text-center">{total}</p>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold tracking-tight">{t(`${survey}Title`)}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {surveyRows.length > 0
                        ? surveyRows
                            .map((row) => `${row.locale.toUpperCase()}: ${row.responses}`)
                            .join(' · ')
                        : t('statsEmpty')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
