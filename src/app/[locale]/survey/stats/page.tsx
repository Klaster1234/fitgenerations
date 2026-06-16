import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SURVEY_TYPES } from '../questions';

// Live, public response counters so partners can monitor participation
// without any account or dashboard access. Counts only - the SECURITY
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
        <header className="mb-10 text-center">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-brand mb-3">
            {t('eyebrow')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t('statsTitle')}
          </h1>
          <p className="mt-4 text-base text-muted max-w-xl mx-auto leading-relaxed">
            {t('statsIntro')}
          </p>
        </header>

        <div className="space-y-4">
          {SURVEY_TYPES.map((survey) => {
            const surveyRows = rows.filter((row) => row.survey === survey);
            const total = surveyRows.reduce((sum, row) => sum + Number(row.responses), 0);
            return (
              <Card
                key={survey}
                className="transition-shadow hover:shadow-card motion-reduce:transition-none"
              >
                <CardContent className="p-6 flex items-center gap-5">
                  <p
                    className={`min-w-16 text-center text-5xl font-bold tabular-nums ${
                      total > 0 ? 'text-brand' : 'text-foreground/25'
                    }`}
                  >
                    {total}
                  </p>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold tracking-tight">{t(`${survey}Title`)}</h2>
                    {surveyRows.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {surveyRows.map((row) => (
                          <span
                            key={row.locale}
                            className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted"
                          >
                            {row.locale.toUpperCase()}
                            <span className="text-foreground/50">{row.responses}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-muted">{t('statsEmpty')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button asChild variant="secondary">
            <Link href="/survey">
              <ArrowLeft size={18} strokeWidth={2.5} />
              {t('indexTitle')}
            </Link>
          </Button>
        </div>
      </main>
    </>
  );
}
