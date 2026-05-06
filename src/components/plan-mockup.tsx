import { Flame, CheckCircle2, Circle, Cloud, Activity, Heart, Leaf, Sparkles, Wind } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

/**
 * Visual mockup of the "Today's plan" screen.
 * Pure HTML/SVG — no real data needed. Used as hero illustration.
 */
export async function PlanMockup() {
  const t = await getTranslations('Mockup');

  return (
    <div className="relative group" style={{ perspective: '1200px' }}>
      {/* Animated breathing glow */}
      <div
        className="absolute -inset-12 bg-gradient-to-br from-brand/40 via-accent-warm/25 to-sun/30 rounded-3xl blur-3xl pointer-events-none animate-breathe"
        aria-hidden
      />

      <div
        className="relative rounded-2xl bg-surface border border-border shadow-elevated overflow-hidden transition-all duration-700 ease-out group-hover:shadow-brand will-change-transform"
        style={{
          transform: 'rotateY(-2deg) rotateX(1.5deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Top bar — pretend browser/app frame */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-surface-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" aria-hidden />
          <span className="ml-3 text-xs text-muted font-mono">fitgenerations.eu</span>
        </div>

        <div className="p-6 sm:p-7">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">
                {t('today')}
              </p>
              <h3 className="mt-1.5 font-display text-xl sm:text-2xl font-medium tracking-[-0.02em]">
                {t('planTitle')}
              </h3>
            </div>
            <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-brand-light to-emerald-100 dark:from-brand-light dark:to-emerald-900/40 text-brand-darker font-bold shadow-soft">
              {/* Subtle pulse on streak fire */}
              <span className="absolute inset-0 rounded-full bg-brand-light animate-ping opacity-30" aria-hidden />
              <Flame className="relative w-4 h-4" aria-hidden />
              <span className="relative tabular-nums">7</span>
            </div>
          </div>

          {/* Weather pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs font-medium text-muted mb-5">
            <Cloud className="w-3.5 h-3.5 text-info" aria-hidden />
            <span>{t('weather')}</span>
          </div>

          {/* AI greeting — labelled with sparkle, with left accent border */}
          <div className="relative pl-4 mb-6">
            <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b from-brand to-accent" aria-hidden />
            <div className="inline-flex items-center gap-1 mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-brand">
              <Sparkles className="w-3 h-3" aria-hidden />
              <span>AI</span>
            </div>
            <p className="font-serif text-[0.95rem] text-foreground/90 leading-relaxed italic">
              {t('greeting')}
            </p>
          </div>

          {/* Exercise list */}
          <ul className="space-y-2">
            {[
              {
                icon: Activity,
                title: t('exercise1Title'),
                duration: '5',
                done: true,
                color: 'text-brand',
              },
              {
                icon: Heart,
                title: t('exercise2Title'),
                duration: '12',
                done: true,
                color: 'text-rose-500 dark:text-rose-400',
              },
              {
                icon: Leaf,
                title: t('exercise3Title'),
                duration: '20',
                done: false,
                color: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                icon: Wind,
                title: t('exercise4Title'),
                duration: '4',
                done: false,
                color: 'text-info',
              },
            ].map((ex, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                  ex.done
                    ? 'bg-brand-light/40 border-brand/40 dark:bg-brand/10 dark:border-brand/30'
                    : 'bg-background border-foreground/15 dark:border-foreground/20'
                }`}
              >
                {ex.done ? (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" aria-hidden />
                ) : (
                  <Circle className="w-5 h-5 text-muted shrink-0" aria-hidden />
                )}
                <ex.icon className={`w-4 h-4 ${ex.color} shrink-0`} aria-hidden />
                <span
                  className={`flex-1 text-sm font-semibold ${
                    ex.done ? 'line-through text-muted' : ''
                  }`}
                >
                  {ex.title}
                </span>
                <span className="text-sm text-foreground/85 font-bold tabular-nums">{ex.duration} min</span>
              </li>
            ))}
          </ul>

          {/* Bottom progress */}
          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center justify-between text-[0.7rem] font-bold tracking-[0.15em] uppercase mb-2">
              <span className="text-muted">{t('progress')}</span>
              <span className="text-brand tabular-nums">2 / 4 ✓</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand via-emerald-500 to-success transition-all"
                style={{ width: '50%' }}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
