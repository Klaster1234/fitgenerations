import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * GDPR privacy notice. Server Component - all copy is sourced from the
 * Privacy translation namespace. The visible-on-page template banner is
 * intentional: this scaffolding ships before WP2 alfa so the project has a
 * link target, but the prose must be reviewed by a lawyer before real
 * participants enrol.
 */
export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Privacy');

  const sections: Array<{ heading: string; body: string }> = [
    { heading: t('controller'), body: t('controller') },
    { heading: t('dataCollected'), body: t('dataCollected') },
    { heading: t('purpose'), body: t('purpose') },
    { heading: t('legalBasis'), body: t('legalBasis') },
    { heading: t('retention'), body: t('retention') },
    { heading: t('rights'), body: t('rights') },
    { heading: t('thirdParties'), body: t('thirdParties') },
    { heading: t('contact'), body: t('contact') },
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
          // Each block displays the same translated paragraph as both heading
          // lead and body. Per the spec, sections live behind single keys -
          // the first sentence reads like a heading and the rest expands it.
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
