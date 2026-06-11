import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppHeader } from '@/components/app-header';
import { submitSurvey } from '../actions';
import { SURVEY_TYPES, SURVEYS, type SurveyType } from '../questions';

const SCALE = [1, 2, 3, 4, 5] as const;
const DAYS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

// Pill-style radio group. Pure CSS (peer-checked) so the server-rendered
// form needs no client JS; `required` on radios makes the group mandatory.
function PillGroup({
  name,
  values,
  labels,
}: {
  name: string;
  values: readonly (string | number)[];
  labels?: Record<string, string>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {values.map((value) => (
        <label key={value} className="cursor-pointer">
          <input type="radio" name={name} value={value} required className="peer sr-only" />
          <span className="flex h-12 min-w-12 items-center justify-center rounded-full border-2 border-foreground/20 px-4 text-base font-bold transition-colors hover:border-brand peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-emerald-950 peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2">
            {labels ? labels[String(value)] : value}
          </span>
        </label>
      ))}
    </div>
  );
}

const textareaClasses =
  'mt-2 flex w-full rounded-xl border-2 border-foreground/20 dark:border-foreground/35 bg-surface-2 px-4 py-3 text-base text-foreground shadow-sm placeholder:text-muted hover:border-foreground/40 dark:hover:border-foreground/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:bg-background';

export default async function SurveyFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; type: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { locale, type } = await params;
  const { done, error } = await searchParams;
  setRequestLocale(locale);

  if (!(SURVEY_TYPES as readonly string[]).includes(type)) notFound();
  const survey = type as SurveyType;

  const t = await getTranslations('Survey');
  const choiceLabels = { yes: t('yes'), no: t('no'), notSure: t('notSure') };

  if (done === '1') {
    return (
      <>
        <AppHeader />
        <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
          <Card>
            <CardContent className="p-10 text-center">
              <h1 className="text-3xl font-bold tracking-tight">{t('doneTitle')}</h1>
              <p className="mt-4 text-lg text-muted">{t('doneBody')}</p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <header className="mb-8">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-brand mb-3">
            {t('eyebrow')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t(`${survey}Title`)}
          </h1>
          <p className="mt-2 text-base text-muted">{t(`${survey}When`)}</p>
          <p className="mt-4 text-sm text-muted">{t('anonymous')}</p>
        </header>

        {error === '1' && (
          <p className="mb-6 rounded-xl border-2 border-danger/40 bg-danger/10 px-4 py-3 text-base text-danger" role="alert">
            {t('errorBody')}
          </p>
        )}

        <form action={submitSurvey} className="space-y-4">
          <input type="hidden" name="survey" value={survey} />
          <input type="hidden" name="locale" value={locale} />

          {SURVEYS[survey].map((q, index) => (
            <Card key={q.id}>
              <CardContent className="p-6">
                <p className="text-base font-semibold leading-relaxed">
                  {index + 1}. {t(`q.${q.id}`)}
                </p>

                {q.kind === 'scale' && (
                  <>
                    <p className="mt-1 text-sm text-muted">{t(q.hint)}</p>
                    <PillGroup name={q.id} values={SCALE} />
                    {q.comment && (
                      <textarea
                        name={`${q.id}_comment`}
                        rows={2}
                        maxLength={2000}
                        placeholder={t('commentLabel')}
                        aria-label={t('commentLabel')}
                        className={textareaClasses}
                      />
                    )}
                  </>
                )}

                {q.kind === 'days' && (
                  <>
                    <p className="mt-1 text-sm text-muted">{t('daysHint')}</p>
                    <PillGroup name={q.id} values={DAYS} />
                  </>
                )}

                {q.kind === 'choice' && (
                  <PillGroup name={q.id} values={q.options} labels={choiceLabels} />
                )}

                {q.kind === 'open' &&
                  (q.long ? (
                    <textarea
                      name={q.id}
                      rows={4}
                      maxLength={2000}
                      placeholder={t('openOptional')}
                      aria-label={t(`q.${q.id}`)}
                      className={textareaClasses}
                    />
                  ) : (
                    <Input
                      name={q.id}
                      maxLength={2000}
                      placeholder={t('openOptional')}
                      aria-label={t(`q.${q.id}`)}
                      className="mt-2"
                    />
                  ))}
              </CardContent>
            </Card>
          ))}

          <Button type="submit" size="lg" className="w-full">
            {t('submit')}
          </Button>
        </form>
      </main>
    </>
  );
}
