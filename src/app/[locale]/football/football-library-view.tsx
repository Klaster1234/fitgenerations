'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SkillCard } from './skill-card';

export type LibExercise = {
  slug: string;
  category: string;
  difficulty: 'low' | 'mid' | 'high';
  name: string;
  description: string;
  video_url: string | null;
  duration_minutes: number;
  why_matters: string | null;
  key_focus: string[] | null;
  pro_tip: string | null;
};

type Filter = 'all' | 'low' | 'mid' | 'high';

const SECTIONS: {
  cat: LibExercise['category'];
  titleKey: 'sectionTricks' | 'sectionDrills' | 'sectionWarmups' | 'sectionGames' | 'sectionGoalkeeper';
  labelKey: 'categoryTrick' | 'categoryDrill' | 'categoryWarmup' | 'categoryGame' | 'sectionGoalkeeper';
  cols: string;
  featured?: boolean;
}[] = [
  { cat: 'football_trick', titleKey: 'sectionTricks', labelKey: 'categoryTrick', cols: 'sm:grid-cols-2 lg:grid-cols-3', featured: true },
  { cat: 'football_drill', titleKey: 'sectionDrills', labelKey: 'categoryDrill', cols: 'sm:grid-cols-2 lg:grid-cols-3' },
  { cat: 'football_warmup', titleKey: 'sectionWarmups', labelKey: 'categoryWarmup', cols: 'sm:grid-cols-2 lg:grid-cols-3' },
  { cat: 'football_game', titleKey: 'sectionGames', labelKey: 'categoryGame', cols: 'sm:grid-cols-2 lg:grid-cols-3' },
  { cat: 'football_goalkeeper', titleKey: 'sectionGoalkeeper', labelKey: 'sectionGoalkeeper', cols: 'sm:grid-cols-2 lg:grid-cols-3' },
];

const FILTERS: { key: Filter; labelKey: 'filterAll' | 'levelLow' | 'levelMid' | 'levelHigh' }[] = [
  { key: 'all', labelKey: 'filterAll' },
  { key: 'low', labelKey: 'levelLow' },
  { key: 'mid', labelKey: 'levelMid' },
  { key: 'high', labelKey: 'levelHigh' },
];

export function FootballLibraryView({ exercises }: { exercises: LibExercise[] }) {
  const t = useTranslations('Football');
  const [filter, setFilter] = useState<Filter>('all');

  const total = exercises.length;
  const tricks = exercises.filter((e) => e.category === 'football_trick').length;
  const keepers = exercises.filter((e) => e.category === 'football_goalkeeper').length;

  const visible = useMemo(
    () => (filter === 'all' ? exercises : exercises.filter((e) => e.difficulty === filter)),
    [exercises, filter],
  );

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 pb-28 sm:py-10 sm:pb-12 space-y-8 sm:space-y-10">
      {/* Hero - gradient pitch-green panel with the headline stats */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-600/25 via-emerald-500/5 to-transparent p-6 sm:p-8">
        <h1 className="text-3xl sm:text-5xl font-display font-medium tracking-tight flex items-center gap-3">
          <span aria-hidden="true">⚽</span> {t('title')}
        </h1>
        <p className="mt-2 text-base sm:text-lg text-muted">{t('summary', { total, tricks })}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Stat value={total} label={t('heroExercises')} />
          <Stat value={tricks} label={t('heroTricks')} />
          {keepers > 0 && <Stat value={keepers} label={t('heroKeeper')} />}
        </div>
      </header>

      {total > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('filterAria')}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`min-h-11 px-4 rounded-pill text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-brand text-emerald-950'
                    : 'bg-surface-2 text-muted hover:text-foreground'
                }`}
              >
                {t(f.labelKey)}
              </button>
            );
          })}
        </div>
      )}

      {SECTIONS.map((s) => {
        const items = visible.filter((e) => e.category === s.cat);
        if (items.length === 0) return null;
        return (
          <section key={s.cat} aria-labelledby={`section-${s.cat}`}>
            <h2
              id={`section-${s.cat}`}
              className={`text-2xl font-display mb-4 flex items-center gap-2 ${
                s.featured ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400' : ''
              }`}
            >
              {s.featured && <span aria-hidden="true" className="text-amber-400">★</span>}
              {t(s.titleKey)}
            </h2>
            <div className={`grid grid-cols-1 ${s.cols} gap-4`}>
              {items.map((ex) => (
                <SkillCard
                  key={ex.slug}
                  exercise={ex}
                  categoryLabel={t(s.labelKey)}
                  minutesShort={t('minutesShort')}
                  featured={s.featured}
                />
              ))}
            </div>
          </section>
        );
      })}

      {total > 0 && visible.length === 0 && (
        <p className="text-center py-8 text-muted">{t('filterEmpty')}</p>
      )}

      {total === 0 && (
        <section className="text-center py-12">
          <p className="text-lg text-muted">{t('empty')}</p>
        </section>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-pill bg-background/60 px-3 py-1.5">
      <span className="font-display text-xl font-semibold text-brand-darker dark:text-brand">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </span>
  );
}
