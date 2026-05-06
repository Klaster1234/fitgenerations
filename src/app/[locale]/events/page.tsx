import { Calendar, MapPin, Users, Zap } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Logo } from '@/components/logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link } from '@/i18n/navigation';

type EventKind = 'mid' | 'olympics';

type FgstEvent = {
  id: string;
  kind: EventKind;
  countryFlag: string;
  city: string;
  participantsTarget: string;
};

// Note: specific dates are not committed publicly until confirmed.
// The proposal places Phase 3 (events) between 01.07.2026 and 31.01.2027.
const EVENTS: FgstEvent[] = [
  {
    id: 'mid-pl',
    kind: 'mid',
    countryFlag: '🇵🇱',
    city: 'Gliwice',
    participantsTarget: '80+',
  },
  {
    id: 'mid-it',
    kind: 'mid',
    countryFlag: '🇮🇹',
    city: 'Potenza',
    participantsTarget: '80+',
  },
  {
    id: 'olympics-pl',
    kind: 'olympics',
    countryFlag: '🇵🇱',
    city: 'Gliwice',
    participantsTarget: '100+',
  },
  {
    id: 'olympics-it',
    kind: 'olympics',
    countryFlag: '🇮🇹',
    city: 'Potenza',
    participantsTarget: '100+',
  },
];

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);

  const t = await getTranslations('Events');
  const tc = await getTranslations('Common');

  return (
    <div className="bg-hero-gradient flex-1 flex flex-col">
      {/* Header — public, so use simple nav */}
      <nav className="relative z-20 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between w-full">
        <Link href="/" className="hover:opacity-80 transition-opacity" aria-label={tc('appName')}>
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/signup"
            className="inline-flex items-center px-5 py-2.5 rounded-pill bg-foreground text-background font-semibold text-sm shadow-soft hover:bg-brand-darker hover:text-white transition-all"
          >
            {tc('appName')}
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-5">
            <Zap className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
            {t('badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            {t('title')}
          </h1>
          <p className="mt-5 text-lg text-muted text-pretty max-w-2xl mx-auto">{t('intro')}</p>
        </header>

        <div className="grid sm:grid-cols-2 gap-5">
          {EVENTS.map((ev) => (
            <article
              key={ev.id}
              className="group rounded-card border-2 border-foreground/10 dark:border-foreground/30 bg-surface p-7 shadow-soft hover:shadow-card hover:-translate-y-0.5 hover:border-emerald-500/40 transition-all"
            >
              {/* Editorial header: eyebrow tag + bold country flag */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <p
                  className={`text-[0.7rem] font-bold uppercase tracking-[0.2em] mt-1 ${
                    ev.kind === 'mid'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {t(ev.kind === 'mid' ? 'midSubtitle' : 'olympicsSubtitle')}
                </p>
                <span className="text-5xl shrink-0 leading-none -mt-1" aria-hidden>
                  {ev.countryFlag}
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight mb-5">
                {t(ev.kind === 'mid' ? 'midTitle' : 'olympicsTitle')}
              </h2>

              <dl className="space-y-2.5 text-base">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <div>
                    <dt className="sr-only">{t('dateLabel')}</dt>
                    <dd className="text-base">
                      <span className="font-bold">
                        {t(ev.kind === 'mid' ? 'midPeriod' : 'olympicsPeriod')}
                      </span>
                      <span className="block text-sm text-foreground/70 mt-0.5">{t('dateTba')}</span>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <div>
                    <dt className="sr-only">{t('locationLabel')}</dt>
                    <dd className="text-base font-bold">{ev.city}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <div>
                    <dt className="sr-only">{t('participantsLabel')}</dt>
                    <dd className="text-base">
                      <span className="font-bold">{ev.participantsTarget}</span>{' '}
                      <span className="text-foreground/70">{t('participants')}</span>
                    </dd>
                  </div>
                </div>
              </dl>

              <p className="mt-6 text-base text-foreground/90 leading-relaxed text-pretty">
                {t(ev.kind === 'mid' ? 'midDescription' : 'olympicsDescription')}
              </p>

              <Link
                href="/signup"
                className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-pill bg-emerald-500 text-emerald-950 font-bold text-sm shadow-soft hover:bg-emerald-400 hover:shadow-card transition-all"
              >
                {t('signUpCta')}
                <span aria-hidden>→</span>
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-16 relative rounded-card bg-gradient-to-br from-[#0a1018] via-emerald-950/40 to-[#0a1018] text-white px-8 py-14 text-center border border-emerald-500/20 overflow-hidden">
          {/* Subtle brand glow inside */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('joinTitle')}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-white/85 max-w-xl mx-auto text-pretty leading-relaxed">
              {t('joinBody')}
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-pill bg-emerald-500 text-emerald-950 font-bold text-base shadow-brand hover:bg-emerald-400 hover:shadow-elevated transition-all"
            >
              {t('joinCta')}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
