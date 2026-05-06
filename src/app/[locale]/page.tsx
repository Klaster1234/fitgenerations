import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Zap, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { PlanMockup } from '@/components/plan-mockup';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Landing');

  return (
    <div className="relative">
      {/* Top nav — minimal, no duplicate CTA (per UX audit) */}
      <nav className="relative z-20 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-base hover:opacity-80 transition-opacity"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand text-emerald-950 shadow-soft">
            <Zap className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="text-brand-darker dark:text-brand">FGST</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/events"
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-pill text-sm font-semibold text-foreground hover:text-brand transition-colors"
          >
            {t('navEvents')}
          </Link>
          <LocaleSwitcher />
          <Link
            href="/login"
            className="inline-flex items-center px-5 py-2.5 rounded-pill border border-foreground/20 text-foreground font-semibold text-sm hover:border-brand hover:text-brand transition-colors"
          >
            {t('ctaSecondary')}
          </Link>
        </div>
      </nav>

      {/* HERO — 2-column, mockup right */}
      <section className="relative bg-hero-gradient overflow-hidden">
        <svg
          className="absolute -right-32 -top-32 w-[44rem] h-[44rem] opacity-50 pointer-events-none"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <defs>
            <radialGradient id="blobA" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            fill="url(#blobA)"
            d="M50 -60Q70 -30 60 0T30 60Q0 70 -30 60T-60 30Q-70 0 -60 -30T-30 -60Q0 -70 30 -60Z"
            transform="translate(100 100)"
          />
        </svg>
        <svg
          className="absolute -left-40 bottom-0 w-[40rem] h-[40rem] opacity-35 pointer-events-none"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <defs>
            <radialGradient id="blobB" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent-warm)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--accent-warm)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="80" fill="url(#blobB)" />
        </svg>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-24 sm:pt-16 sm:pb-32">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
            <div className="text-center lg:text-left">
              {/* Erasmus+ EU badge — proper EU-style pill, always readable */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-eu-blue text-white shadow-soft animate-float mb-7">
                <span className="text-eu-yellow text-base leading-none font-black" aria-hidden>
                  ★
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  {t('eyebrow')}
                </span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-medium tracking-[-0.03em] text-balance leading-[0.96]">
                {t('heroPart1')}{' '}
                <span className="relative inline-block italic">
                  {t('heroPart2')}
                  <svg
                    className="absolute -bottom-2 lg:-bottom-3 left-0 w-full h-3 lg:h-4 text-brand"
                    viewBox="0 0 200 12"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      d="M2,8 C 50,2 100,11 198,5"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mt-7 text-xl text-muted leading-relaxed text-pretty lg:max-w-xl">
                {t('lede')}
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-pill bg-emerald-500 text-emerald-950 font-bold text-base shadow-brand hover:bg-emerald-400 hover:shadow-elevated transition-all"
                >
                  {t('ctaPrimary')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden strokeWidth={2.5} />
                </Link>
                <Link
                  href="/events"
                  className="inline-flex items-center px-6 py-4 rounded-pill border-2 border-foreground/20 text-foreground font-bold text-base hover:border-brand hover:text-brand transition-colors"
                >
                  {t('navEventsCta')}
                </Link>
              </div>
            </div>

            <div className="mt-4 lg:mt-0">
              <PlanMockup />
            </div>
          </div>
        </div>
      </section>

      {/* MANIFEST — dark, dramatic, serif. The page's emotional centerpiece. */}
      <section className="relative bg-[#0a1018] text-white overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
          aria-hidden
        />
        {/* Starry dots — subtle */}
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, white 0.5px, transparent 1px), radial-gradient(circle at 75% 60%, white 0.5px, transparent 1px), radial-gradient(circle at 45% 80%, white 0.5px, transparent 1px), radial-gradient(circle at 90% 20%, white 0.5px, transparent 1px), radial-gradient(circle at 10% 75%, white 0.5px, transparent 1px), radial-gradient(circle at 60% 15%, white 0.5px, transparent 1px)',
            backgroundSize: '120% 120%',
            backgroundPosition: 'center',
          }}
          aria-hidden
        />
        {/* Brand glow accent */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44rem] h-[44rem] rounded-full bg-brand/20 blur-[100px] pointer-events-none animate-breathe"
          aria-hidden
        />
        {/* Secondary warmth glow — bottom right */}
        <div
          className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-[28rem] h-[28rem] rounded-full bg-accent-warm/15 blur-[80px] pointer-events-none"
          aria-hidden
        />

        <div className="reveal-on-scroll relative max-w-4xl mx-auto px-6 py-28 sm:py-40 text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.35em] text-brand mb-10 text-glow-brand">
            ★ {t('manifestKicker')} ★
          </p>
          <blockquote className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-medium italic leading-[1.4] tracking-[-0.01em] text-pretty">
            <span
              aria-hidden
              className="font-display not-italic text-brand text-4xl sm:text-5xl lg:text-6xl leading-none mr-1 opacity-80"
            >
              &ldquo;
            </span>
            {t('manifestQuote')}
            <span
              aria-hidden
              className="font-display not-italic text-brand text-4xl sm:text-5xl lg:text-6xl leading-none ml-1 opacity-80"
            >
              &rdquo;
            </span>
          </blockquote>
          <div className="mt-14 flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-white/30" aria-hidden />
            <p className="text-xs font-bold tracking-widest uppercase text-white/80">
              {t('manifestAttribution')}
            </p>
            <span className="h-px w-12 bg-white/30" aria-hidden />
          </div>
        </div>
      </section>

      {/* THREE VALUES — editorial, alternating */}
      <section className="relative bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 space-y-24 sm:space-y-32">
          {/* Value 1 — text left, big number right */}
          <div className="reveal-on-scroll grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-[0.75rem] font-bold uppercase tracking-wider text-emerald-400 mb-5">
                01 / {t('value1Kicker')}
              </p>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium tracking-[-0.025em] text-balance leading-[1.02]">
                {t('value1Title')}
              </h2>
              <p className="mt-6 text-lg text-muted leading-relaxed text-pretty">
                {t('value1Body')}
              </p>
            </div>
            <div className="text-center lg:text-right">
              <span className="font-display block text-[9rem] sm:text-[12rem] lg:text-[14rem] font-medium leading-[0.85] tracking-[-0.05em] bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                4
              </span>
              <p className="mt-3 text-sm font-bold tracking-wider uppercase text-foreground/80">{t('value1Caption')}</p>
            </div>
          </div>

          {/* Decorative ornament between values */}
          <div className="flex justify-center -my-6 sm:-my-8" aria-hidden>
            <svg viewBox="0 0 80 24" className="w-24 h-6 text-brand/60">
              <path
                d="M2 12 Q 20 2, 40 12 T 78 12"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="40" cy="12" r="2.5" fill="currentColor" opacity="0.8" />
            </svg>
          </div>

          {/* Value 2 — number left, text right */}
          <div className="reveal-on-scroll grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left lg:order-1 order-2">
              <span className="font-display block text-[9rem] sm:text-[12rem] lg:text-[14rem] font-medium leading-[0.85] tracking-[-0.05em] bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                27<span className="text-[6rem] sm:text-[8rem] lg:text-[9rem]">+</span>
              </span>
              <p className="mt-3 text-sm font-bold tracking-wider uppercase text-foreground/80">{t('value2Caption')}</p>
            </div>
            <div className="lg:order-2 order-1">
              <p className="text-[0.75rem] font-bold uppercase tracking-wider text-orange-300 mb-5">
                02 / {t('value2Kicker')}
              </p>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium tracking-[-0.025em] text-balance leading-[1.02]">
                {t('value2Title')}
              </h2>
              <p className="mt-6 text-lg text-muted leading-relaxed text-pretty">
                {t('value2Body')}
              </p>
            </div>
          </div>

          {/* Decorative ornament between values 2 and 3 */}
          <div className="flex justify-center -my-6 sm:-my-8" aria-hidden>
            <svg viewBox="0 0 80 24" className="w-20 h-6 text-brand/40">
              <path
                d="M2 12 Q 20 22, 40 12 T 78 12"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="40" cy="12" r="2" fill="currentColor" opacity="0.6" />
            </svg>
          </div>

          {/* Value 3 — text left, number right */}
          <div className="reveal-on-scroll grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-[0.75rem] font-bold uppercase tracking-wider text-emerald-400 mb-5">
                03 / {t('value3Kicker')}
              </p>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium tracking-[-0.025em] text-balance leading-[1.02]">
                {t('value3Title')}
              </h2>
              <p className="mt-6 text-lg text-muted leading-relaxed text-pretty">
                {t('value3Body')}
              </p>
            </div>
            <div className="text-center lg:text-right">
              <span className="font-display block text-[9rem] sm:text-[12rem] lg:text-[14rem] font-medium leading-[0.85] tracking-[-0.05em] bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                260<span className="text-[6rem] sm:text-[8rem] lg:text-[9rem]">+</span>
              </span>
              <p className="mt-3 text-sm font-bold tracking-wider uppercase text-foreground/80">{t('value3Caption')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — direct, no fluff */}
      <section className="relative bg-hero-gradient overflow-hidden">
        <svg
          className="absolute -right-24 top-1/2 -translate-y-1/2 w-[36rem] h-[36rem] opacity-30 pointer-events-none"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <defs>
            <radialGradient id="ctaBlob" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="80" fill="url(#ctaBlob)" />
        </svg>

        <div className="relative max-w-4xl mx-auto px-6 py-28 sm:py-36 text-center">
          <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium tracking-[-0.03em] text-balance leading-[1.0]">
            {t('ctaSectionTitle')}
          </h2>
          <Link
            href="/signup"
            className="group mt-12 inline-flex items-center gap-2 px-9 py-5 rounded-pill bg-emerald-500 text-emerald-950 font-bold text-lg shadow-brand hover:bg-emerald-400 hover:shadow-elevated transition-all"
          >
            <span>{t('ctaPrimary')}</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" aria-hidden strokeWidth={2.5} />
          </Link>
          <p className="mt-6 text-sm text-muted">{t('freeForever')}</p>
        </div>
      </section>
    </div>
  );
}
