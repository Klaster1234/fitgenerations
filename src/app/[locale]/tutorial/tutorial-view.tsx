'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, CheckCircle2, Users, ArrowRight, ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * 3-slide guided intro shown before the onboarding wizard.
 * Suggested by Luigi (EURO-NET, IT partner) during alpha review — helps
 * first-time users grasp what the app does before they fill in 6 form
 * fields. Senior-friendly: big icons, big type, generous touch targets,
 * dot indicator for progress, "Skip" available on every slide.
 *
 * Pure client state (useState) — no URL params, no DB tracking. The page
 * is only ever reached when the user hasn't completed onboarding yet, so
 * we don't need a "tutorial_seen" flag.
 */
const TOTAL = 3;

export function TutorialView() {
  const t = useTranslations('Tutorial');
  const [slide, setSlide] = useState(0); // 0-indexed: 0, 1, 2

  const next = () => setSlide((s) => Math.min(s + 1, TOTAL - 1));
  const back = () => setSlide((s) => Math.max(s - 1, 0));
  const isLast = slide === TOTAL - 1;

  // Three slide content blocks. Translation keys live under Tutorial.* in
  // all four locale files (en/pl/it/uk).
  const slides = [
    { icon: Sparkles, titleKey: 'slide1Title' as const, bodyKey: 'slide1Body' as const },
    { icon: CheckCircle2, titleKey: 'slide2Title' as const, bodyKey: 'slide2Body' as const },
    { icon: Users, titleKey: 'slide3Title' as const, bodyKey: 'slide3Body' as const },
  ];
  const current = slides[slide];
  const Icon = current.icon;

  return (
    <div className="w-full max-w-xl">
      {/* Progress label + dots */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-bold text-muted">
          {t('progress', { current: slide + 1, total: TOTAL })}
        </p>
        <div className="flex items-center gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`block h-2 rounded-full transition-all ${
                i === slide
                  ? 'w-8 bg-brand'
                  : i < slide
                    ? 'w-2 bg-brand/60'
                    : 'w-2 bg-foreground/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Slide card */}
      <div className="rounded-card border border-border/60 bg-surface shadow-card p-8 sm:p-12 text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-light text-brand mb-7 shadow-soft"
          aria-hidden
        >
          <Icon className="w-10 h-10" strokeWidth={2.25} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          {t(current.titleKey)}
        </h1>
        <p className="mt-5 text-lg text-foreground/85 leading-relaxed text-pretty max-w-md mx-auto">
          {t(current.bodyKey)}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {slide > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            className="border-2 border-foreground/15 dark:border-foreground/20 hover:border-foreground/30"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} aria-hidden />
            <span>{t('back')}</span>
          </Button>
        ) : (
          <Link
            href="/onboarding"
            className="inline-flex items-center min-h-12 px-4 py-2 rounded-pill text-base font-semibold text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            {t('skip')}
          </Link>
        )}

        {isLast ? (
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 min-h-12 px-6 py-3 rounded-pill bg-emerald-500 text-emerald-950 font-bold text-base shadow-soft hover:bg-emerald-400 hover:shadow-card transition-all"
          >
            <span>{t('finish')}</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          </Link>
        ) : (
          <Button type="button" onClick={next}>
            <span>{t('next')}</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
