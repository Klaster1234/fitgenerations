import { setRequestLocale } from 'next-intl/server';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FootballLibraryView, type LibExercise } from './football-library-view';

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

function normDifficulty(v: unknown): LibExercise['difficulty'] {
  return v === 'low' || v === 'high' ? v : 'mid';
}

export default async function FootballPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from('exercises')
    .select('slug, category, difficulty, name, description, video_url, duration_minutes, why_matters, key_focus, pro_tip')
    .in('category', ['football_warmup', 'football_drill', 'football_trick', 'football_game', 'football_goalkeeper']);

  const exercises: LibExercise[] = (rows ?? []).map((row) => ({
    slug: row.slug as string,
    category: row.category as string,
    difficulty: normDifficulty(row.difficulty),
    name: pickLocaleText(row.name, locale) ?? (row.slug as string),
    description: pickLocaleText(row.description, locale) ?? '',
    video_url: (row.video_url as string | null) ?? null,
    duration_minutes: row.duration_minutes as number,
    why_matters: pickLocaleText(row.why_matters, locale),
    key_focus: pickLocaleArr(row.key_focus, locale),
    pro_tip: pickLocaleText(row.pro_tip, locale),
  }));

  return (
    <>
      <AppHeader />
      <FootballLibraryView exercises={exercises} />
    </>
  );
}

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'pl' }, { locale: 'it' }, { locale: 'uk' }];
}
