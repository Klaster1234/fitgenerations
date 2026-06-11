import { getTranslations, setRequestLocale } from 'next-intl/server';
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
        <header className="mb-8 text-center">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-brand mb-3">
            {t('eyebrow')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t('indexTitle')}
          </h1>
          <p className="mt-4 text-base text-muted">{t('indexIntro')}</p>
          <p className="mt-2 text-sm text-muted">{t('anonymous')}</p>
        </header>

        <div className="space-y-4">
          {SURVEY_TYPES.map((survey) => (
            <Card key={survey}>
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold tracking-tight">{t(`${survey}Title`)}</h2>
                  <p className="mt-1 text-base text-muted">{t(`${survey}When`)}</p>
                </div>
                <Button asChild>
                  <Link href={`/survey/${survey}`}>{t('open')}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center">
          <Link href="/survey/stats" className="text-base font-semibold text-brand underline underline-offset-4">
            {t('statsTitle')}
          </Link>
        </p>
      </main>
    </>
  );
}
