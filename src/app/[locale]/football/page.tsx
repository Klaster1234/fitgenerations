import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SkillCard } from './skill-card';

type PageProps = {
  params: Promise<{ locale: string }>;
};

function pickLocaleText(jsonb: unknown, locale: string): string | null {
  if (!jsonb || typeof jsonb !== 'object') return null;
  const obj = jsonb as Record<string, unknown>;
  const val = obj[locale] ?? obj.en;
  return typeof val === 'string' ? val : null;
}

function pickLocaleArr(jsonb: unknown, locale: string): string[] | null {
  if (!jsonb || typeof jsonb !== 'object') return null;
  const obj = jsonb as Record<string, unknown>;
  const val = obj[locale] ?? obj.en;
  return Array.isArray(val) && val.every((v) => typeof v === 'string') ? val : null;
}

export default async function FootballLibrary({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Football');

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from('exercises')
    .select('slug, category, name, description, video_url, duration_minutes, why_matters, key_focus, pro_tip')
    .in('category', ['football_warmup', 'football_drill', 'football_trick', 'football_game', 'football_goalkeeper']);

  const exercises = (rows ?? []).map((row) => ({
    slug: row.slug as string,
    category: row.category as string,
    name: pickLocaleText(row.name, locale) ?? (row.slug as string),
    description: pickLocaleText(row.description, locale) ?? '',
    video_url: (row.video_url as string | null) ?? null,
    duration_minutes: row.duration_minutes as number,
    why_matters: pickLocaleText(row.why_matters, locale),
    key_focus: pickLocaleArr(row.key_focus, locale),
    pro_tip: pickLocaleText(row.pro_tip, locale),
  }));

  const byCategory = {
    football_trick: exercises.filter((e) => e.category === 'football_trick'),
    football_drill: exercises.filter((e) => e.category === 'football_drill'),
    football_warmup: exercises.filter((e) => e.category === 'football_warmup'),
    football_game: exercises.filter((e) => e.category === 'football_game'),
    football_goalkeeper: exercises.filter((e) => e.category === 'football_goalkeeper'),
  };

  const total = exercises.length;
  const tricks = byCategory.football_trick.length;

  const minutesShort = t('minutesShort');
  const categoryLabels: Record<string, string> = {
    football_warmup: t('categoryWarmup'),
    football_drill: t('categoryDrill'),
    football_trick: t('categoryTrick'),
    football_game: t('categoryGame'),
    football_goalkeeper: t('sectionGoalkeeper'),
  };

  return (
    <>
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        <header>
          <h1 className="text-4xl font-display flex items-center gap-3">
            <span aria-hidden="true">⚽</span> {t('title')}
          </h1>
          <p className="mt-2 text-lg text-muted">{t('summary', { total, tricks })}</p>
        </header>

        {byCategory.football_trick.length > 0 && (
          <section aria-labelledby="section-tricks">
            <h2 id="section-tricks" className="text-2xl font-display mb-4">{t('sectionTricks')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {byCategory.football_trick.map((ex) => (
                <SkillCard
                  key={ex.slug}
                  exercise={ex}
                  categoryLabel={categoryLabels[ex.category] ?? ex.category}
                  minutesShort={minutesShort}
                />
              ))}
            </div>
          </section>
        )}

        {byCategory.football_drill.length > 0 && (
          <section aria-labelledby="section-drills">
            <h2 id="section-drills" className="text-2xl font-display mb-4">{t('sectionDrills')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byCategory.football_drill.map((ex) => (
                <SkillCard
                  key={ex.slug}
                  exercise={ex}
                  categoryLabel={categoryLabels[ex.category] ?? ex.category}
                  minutesShort={minutesShort}
                />
              ))}
            </div>
          </section>
        )}

        {byCategory.football_warmup.length > 0 && (
          <section aria-labelledby="section-warmups">
            <h2 id="section-warmups" className="text-2xl font-display mb-4">{t('sectionWarmups')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byCategory.football_warmup.map((ex) => (
                <SkillCard
                  key={ex.slug}
                  exercise={ex}
                  categoryLabel={categoryLabels[ex.category] ?? ex.category}
                  minutesShort={minutesShort}
                />
              ))}
            </div>
          </section>
        )}

        {byCategory.football_game.length > 0 && (
          <section aria-labelledby="section-games">
            <h2 id="section-games" className="text-2xl font-display mb-4">{t('sectionGames')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byCategory.football_game.map((ex) => (
                <SkillCard
                  key={ex.slug}
                  exercise={ex}
                  categoryLabel={categoryLabels[ex.category] ?? ex.category}
                  minutesShort={minutesShort}
                />
              ))}
            </div>
          </section>
        )}

        {byCategory.football_goalkeeper.length > 0 && (
          <section aria-labelledby="section-goalkeeper">
            <h2 id="section-goalkeeper" className="text-2xl font-display mb-4">{t('sectionGoalkeeper')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byCategory.football_goalkeeper.map((ex) => (
                <SkillCard
                  key={ex.slug}
                  exercise={ex}
                  categoryLabel={categoryLabels[ex.category] ?? ex.category}
                  minutesShort={minutesShort}
                />
              ))}
            </div>
          </section>
        )}

        {total === 0 && (
          <section className="text-center py-12">
            <p className="text-lg text-muted">{t('empty')}</p>
          </section>
        )}
      </main>
    </>
  );
}

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'pl' }, { locale: 'it' }, { locale: 'uk' }];
}
