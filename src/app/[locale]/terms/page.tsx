import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * Terms of service. Same template scaffolding as /privacy - ships now so
 * the project has a link target before WP2 alfa, prose to be reviewed by a
 * lawyer before real participants enrol.
 */
export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Terms');

  const sections: Array<{ body: string }> = [
    { body: t('eligibility') },
    { body: t('accountResponsibility') },
    { body: t('acceptableUse') },
    { body: t('disclaimer') },
    { body: t('liability') },
    { body: t('changes') },
    { body: t('contact') },
  ];

  return (
    <main className="flex-1 px-6 py-10">
      <article className="max-w-2xl mx-auto">
        <p
          className="mb-6 rounded-xl border-2 border-accent/30 bg-accent/5 px-4 py-3 text-sm font-semibold text-accent"
          role="note"
        >
          {t('templateNotice')}
        </p>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm text-muted">{t('lastUpdated')}</p>
        </header>

        <p className="text-lg leading-relaxed text-pretty">{t('intro')}</p>

        {sections.map((s, i) => {
          const firstStop = s.body.indexOf('.');
          const heading = firstStop > 0 ? s.body.slice(0, firstStop) : s.body;
          const rest = firstStop > 0 ? s.body.slice(firstStop + 1).trim() : '';

          return (
            <section key={i} className="mt-8">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{heading}</h2>
              {rest && <p className="mt-3 text-base leading-relaxed text-pretty">{rest}</p>}
            </section>
          );
        })}
      </article>
    </main>
  );
}
