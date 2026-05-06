import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getStreak } from '@/lib/db/streak';
import { RegenerateButton } from './regenerate-button';
import { DoneButton } from './done-button';

type PlanItem = { exercise_slug: string; duration_minutes: number; ai_note: string; order: number };
type Weather = {
  city: string;
  temperatureC: number;
  description: string;
  isOutdoorFriendly: boolean;
};

export default async function PlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect({ href: '/login', locale });
  }

  const userId = userData.user!.id;

  // Make sure profile is onboarded.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at, locale, city')
    .eq('id', userId)
    .single();
  if (!profile?.onboarded_at) {
    redirect({ href: '/onboarding', locale });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Fetch plan + streak + today's done logs in parallel.
  const [planRes, streak, doneTodayRes] = await Promise.all([
    supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .maybeSingle(),
    getStreak(userId),
    supabase
      .from('activity_logs')
      .select('exercise_id, exercises:exercise_id(slug)')
      .eq('user_id', userId)
      .eq('log_date', today),
  ]);

  let plan = planRes.data;

  // Auto-generate plan if missing.
  if (!plan) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const cookieHeader = (await supabase.auth.getSession()).data.session?.access_token;
    await fetch(`${origin}/api/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader ? `sb-access-token=${cookieHeader}` : '',
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    }).catch(() => null);

    const reload = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .maybeSingle();
    plan = reload.data;
  }

  const t = await getTranslations('Plan');

  // Build set of exercise slugs done today.
  type DoneRow = { exercises: { slug: string } | { slug: string }[] | null };
  const doneSlugs = new Set<string>();
  for (const row of (doneTodayRes.data as DoneRow[] | null) ?? []) {
    if (!row.exercises) continue;
    if (Array.isArray(row.exercises)) {
      for (const e of row.exercises) doneSlugs.add(e.slug);
    } else {
      doneSlugs.add(row.exercises.slug);
    }
  }

  const items = (plan?.items ?? []) as PlanItem[];
  const slugs = items.map((it) => it.exercise_slug);
  const { data: exercises } = await supabase
    .from('exercises')
    .select('slug, name, category, video_url')
    .in('slug', slugs.length ? slugs : ['']);

  const byslug = new Map((exercises ?? []).map((e) => [e.slug, e]));
  const weather = plan?.weather as Weather | null;

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('todayTitle')}</h1>
            {weather && (
              <p className="mt-2 text-muted">
                {t('weatherFor', { city: weather.city })}: {weather.temperatureC}°C — {weather.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-brand-light text-brand-dark font-bold text-lg">
              <span aria-hidden>🔥</span>
              <span>{streak}</span>
            </div>
            <p className="text-xs text-muted mt-1">{t('streakLabel')}</p>
          </div>
        </header>

        {!plan ? (
        <Card>
          <CardContent className="p-6 text-center text-muted">{t('noPlanYet')}</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plan.ai_summary && (
            <Card>
              <CardContent className="p-6 text-base leading-relaxed whitespace-pre-line">
                {plan.ai_summary}
              </CardContent>
            </Card>
          )}

          <ol className="space-y-3">
            {items.map((it) => {
              const ex = byslug.get(it.exercise_slug);
              const name =
                ex && (ex.name as Record<string, string>)[locale]
                  ? (ex.name as Record<string, string>)[locale]
                  : it.exercise_slug;
              const done = doneSlugs.has(it.exercise_slug);
              return (
                <li key={it.order}>
                  <Card className={done ? 'border-success/40 bg-brand-light/30' : ''}>
                    <CardHeader>
                      <div className="flex items-baseline gap-3 justify-between">
                        <CardTitle className="text-lg">
                          {it.order}. {name}
                        </CardTitle>
                        <span className="text-sm text-muted shrink-0">
                          {t('minutes', { count: it.duration_minutes })}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base leading-relaxed">{it.ai_note}</p>
                      <div className="mt-4 flex items-center gap-3 flex-wrap">
                        <DoneButton
                          planId={plan.id as string}
                          exerciseSlug={it.exercise_slug}
                          durationMinutes={it.duration_minutes}
                          alreadyDone={done}
                        />
                        {ex?.video_url && (
                          <a
                            href={ex.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-brand hover:text-brand-dark underline"
                          >
                            ▸ Video
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>

            <div className="pt-4 flex justify-center">
              <RegenerateButton />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
