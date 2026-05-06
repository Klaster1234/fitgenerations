import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Landing');
  const tc = await getTranslations('Common');

  return (
    <main className="flex-1">
      <section className="px-6 pt-16 pb-12 max-w-3xl mx-auto text-center">
        <p className="text-sm font-semibold tracking-wide text-brand uppercase">
          {tc('appName')}
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-balance">
          {t('hero')}
        </h1>
        <p className="mt-6 text-lg text-muted leading-relaxed text-balance">{t('lede')}</p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex justify-center items-center px-6 py-3 rounded-full bg-brand text-white font-semibold text-base shadow-sm hover:bg-brand-dark transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t('ctaPrimary')}
          </Link>
          <Link
            href="/login"
            className="inline-flex justify-center items-center px-6 py-3 rounded-full border-2 border-brand text-brand font-semibold text-base hover:bg-brand/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t('ctaSecondary')}
          </Link>
        </div>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
        {(['1', '2', '3'] as const).map((n) => (
          <article
            key={n}
            className="rounded-2xl border border-border bg-surface p-6 text-left"
          >
            <h2 className="text-lg font-semibold">{t(`feature${n}Title` as `feature${1 | 2 | 3}Title`)}</h2>
            <p className="mt-2 text-muted leading-relaxed">
              {t(`feature${n}Body` as `feature${1 | 2 | 3}Body`)}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
