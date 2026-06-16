import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { SURVEY_TYPES } from './questions';

export default async function SurveyIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Survey');

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <header className="mb-10 text-center">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-brand mb-3">
            {t('eyebrow')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t('indexTitle')}
          </h1>
          <p className="mt-4 text-base text-muted max-w-xl mx-auto leading-relaxed">
            {t('indexIntro')}
          </p>
        </header>

        <div className="space-y-4">
          {SURVEY_TYPES.map((survey, index) => (
            <Card
              key={survey}
              className="transition-shadow hover:shadow-card motion-reduce:transition-none"
            >
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-base font-bold text-brand"
                >
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h2 className="text-xl font-bold tracking-tight">{t(`${survey}Title`)}</h2>
                  <p className="mt-1 text-base text-muted">{t(`${survey}When`)}</p>
                </div>
                <Button asChild className="active:scale-[0.99] motion-reduce:active:scale-100">
                  <Link href={`/survey/${survey}`}>
                    {t('open')}
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted text-center">{t('anonymous')}</p>

        <div className="mt-8 text-center">
          <Button asChild variant="secondary">
            <Link href="/survey/stats">
              <BarChart3 size={18} strokeWidth={2.5} />
              {t('statsTitle')}
            </Link>
          </Button>
        </div>
      </main>
    </>
  );
}
