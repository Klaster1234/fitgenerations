import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { CoachingSection } from '@/components/coaching-section';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getStreak } from '@/lib/db/streak';
import { ensureTodayPlan, type DailyPlan } from '@/lib/ai/plan-service';
import { RegenerateButton } from './regenerate-button';
import { DoneButton } from './done-button';

// Coaching fields (why_matters / pro_tip / key_focus) ship as JSONB with the
// same {en,pl,it,uk} shape as exercises.name. These helpers pull the
// profile-locale string (falling back to en) so CoachingSection receives
// plain strings instead of having to know about the JSONB envelope.
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
  // Proxy.ts auto-creates an anonymous session on protected paths, so
  // userData.user is essentially always populated here. The fallback
  // redirect to "/" handles the edge case where Supabase is unreachable.
  if (!userData.user) {
    redirect({ href: '/', locale });
  }

  const userId = userData.user!.id;

  // Force the tutorial+onboarding flow for fresh accounts so the AI plan is
  // actually tailored. Without this, anonymous users land on /plan with
  // default age=40 / locale=en and never see the wizard. New users are
  // sent to /tutorial first (3 short intro slides per Luigi's alpha-review
  // feedback), then the tutorial forwards them into /onboarding for the
  // 6-step form. Returning, fully-onboarded users skip both.
  const { data: onboardingState } = await supabase
    .from('profiles')
    .select('onboarded_at, trains_with_partner, interests')
    .eq('id', userId)
    .maybeSingle();
  if (!onboardingState?.onboarded_at) {
    redirect({ href: '/tutorial', locale });
  }
  const trainsWithPartner = onboardingState?.trains_with_partner === true;
  const interests = (onboardingState?.interests as string[] | null) ?? [];
  const isFootball = interests.includes('football');

  const today = new Date().toISOString().slice(0, 10);

  // Make sure today's plan exists (generates + persists if missing).
  // Calls the service directly - no same-origin fetch, no cookie forwarding.
  // Pass the URL locale as a fallback so unfilled profiles still get
  // localized plans.
  const ensured = await ensureTodayPlan(supabase, userId, { locale });

  // Fetch streak + today's done logs in parallel with the plan already loaded.
  const [streak, doneTodayRes] = await Promise.all([
    getStreak(userId),
    supabase
      .from('activity_logs')
      .select('exercise_id, exercises:exercise_id(slug)')
      .eq('user_id', userId)
      .eq('log_date', today),
  ]);

  const plan: DailyPlan | null = ensured.ok ? ensured.plan : null;

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

  const items = plan?.items ?? [];
  const slugs = items.map((it) => it.exercise_slug);
  // Used to render the "see you tomorrow" retention banner - cheaper than
  // shipping push notifications for the MVP, addresses persona-audit P1 #12.
  const allDone = items.length > 0 && items.every((it) => doneSlugs.has(it.exercise_slug));
  type ExerciseRow = {
    slug: string;
    name: Record<string, string>;
    category: string;
    video_url: string | null;
    why_matters: unknown;
    key_focus: unknown;
    pro_tip: unknown;
  };
  const { data: exercises } =
    slugs.length === 0
      ? { data: [] as ExerciseRow[] }
      : await supabase
          .from('exercises')
          .select('slug, name, category, video_url, why_matters, key_focus, pro_tip')
          .in('slug', slugs);

  const byslug = new Map((exercises ?? []).map((e) => [e.slug, e]));
  const weather = plan?.weather ?? null;

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('todayTitle')}</h1>
            {isFootball && (
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-warm/30 text-accent text-sm font-medium">
                <span aria-hidden="true">⚽</span> {t('footballMode')}
              </span>
            )}
            {weather && (
              <p className="mt-2 text-muted">
                {t('weatherFor', { city: weather.city })}: {weather.temperatureC}°C - {weather.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-brand-light text-brand-darker dark:bg-brand-dark/20 dark:text-foreground font-bold text-lg"
              aria-label={t('streakLabel') + ': ' + streak}
            >
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

          {trainsWithPartner && (
            <Card className="border-2 border-accent/40 bg-accent-warm/15 dark:bg-accent/10">
              <CardContent className="p-5">
                <p className="text-base font-bold text-foreground">
                  <span aria-hidden className="mr-2">👯</span>
                  {t('partnerBannerTitle')}
                </p>
                <p className="mt-1.5 text-sm text-foreground/85 leading-relaxed">
                  {t('partnerBannerBody')}
                </p>
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
              const isPair = ex?.category === 'pair';
              return (
                <li key={it.order}>
                  <Card className={done ? 'border-success/40 bg-brand-light/30' : ''}>
                    <CardHeader>
                      <div className="flex items-baseline gap-3 justify-between">
                        <CardTitle className="text-lg">
                          {it.order}. {name}
                          {isPair && (
                            <span className="ml-2 inline-flex items-center align-middle px-2 py-0.5 rounded-full bg-accent-warm/30 text-accent text-xs font-bold uppercase tracking-wide">
                              {t('partnerBadge')}
                            </span>
                          )}
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
                          planId={plan.id}
                          exerciseSlug={it.exercise_slug}
                          durationMinutes={it.duration_minutes}
                          alreadyDone={done}
                        />
                        {ex?.video_url && (
                          <a
                            href={ex.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base font-semibold text-brand hover:text-brand-dark underline inline-flex items-center gap-1 min-h-12 px-2"
                          >
                            <span aria-hidden>▸</span>
                            <span>{t('video')}</span>
                          </a>
                        )}
                      </div>
                      <CoachingSection
                        whyMatters={pickLocaleText(ex?.why_matters, locale)}
                        keyFocus={pickLocaleArr(ex?.key_focus, locale)}
                        proTip={pickLocaleText(ex?.pro_tip, locale)}
                        defaultOpen={isFootball}
                      />
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>

            {allDone && (
              <Card className="border-2 border-success/40 bg-brand-light/40">
                <CardContent className="p-6 text-center">
                  <p className="text-2xl font-bold text-brand-darker dark:text-brand">
                    {t('allDoneTitle')}
                  </p>
                  <p className="mt-2 text-base text-foreground/90 leading-relaxed">
                    {t('allDoneBody', { count: streak })}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="pt-4 flex justify-center">
              <RegenerateButton />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
