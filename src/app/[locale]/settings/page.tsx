import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { OnboardingWizard, type OnboardingDefaults } from '../onboarding/wizard';
import { updateInterests } from './actions';

const INTEREST_KEYS = ['fitness', 'football', 'green'] as const;

export default async function SettingsPage({
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
    redirect({ href: '/', locale });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('age, fitness_level, interests, equipment, goals, city, trains_with_partner, group_code, is_goalkeeper')
    .eq('id', userData.user!.id)
    .maybeSingle();

  const defaults: OnboardingDefaults = {
    age: profile?.age ?? null,
    fitness_level: (profile?.fitness_level as OnboardingDefaults['fitness_level']) ?? null,
    interests: (profile?.interests as string[] | null) ?? null,
    equipment: (profile?.equipment as string[] | null) ?? null,
    goals: (profile?.goals as string[] | null) ?? null,
    city: profile?.city ?? null,
    trains_with_partner: profile?.trains_with_partner ?? null,
    group_code: profile?.group_code ?? null,
    is_goalkeeper: profile?.is_goalkeeper ?? null,
  };

  const t = await getTranslations('Settings');
  const ti = await getTranslations('Interests');
  const tc = await getTranslations('Common');

  const savedInterests = (profile?.interests as string[] | null) ?? [];
  const savedGoalkeeper = profile?.is_goalkeeper === true;

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-xl mx-auto w-full">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t('title')}
          </h1>
          <p className="mt-3 text-lg text-muted text-pretty">{t('subtitle')}</p>
        </header>

        <Card className="shadow-card border-border/60 mb-6">
          <CardContent className="p-7 sm:p-8">
            <section className="space-y-3" aria-labelledby="interests-heading">
              <h2 id="interests-heading" className="text-xl font-medium">
                {ti('settingsTitle')}
              </h2>
              <p className="text-base text-muted">{ti('settingsHint')}</p>
              <form action={updateInterests} className="space-y-2">
                {INTEREST_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 min-h-12 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="interests"
                      value={key}
                      defaultChecked={savedInterests.includes(key)}
                      className="w-5 h-5 accent-brand"
                    />
                    <span className="text-base">{ti(key)}</span>
                  </label>
                ))}
                <label className="flex items-center gap-3 min-h-12 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_goalkeeper"
                    defaultChecked={savedGoalkeeper}
                    className="w-5 h-5 accent-brand"
                  />
                  <span className="text-base">{ti('goalkeeper')}</span>
                </label>
                <button
                  type="submit"
                  className="mt-4 px-6 py-3 bg-brand text-white rounded-md min-h-12 text-base font-medium"
                >
                  {tc('save')}
                </button>
              </form>
            </section>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/60">
          <CardContent className="p-7 sm:p-8">
            <OnboardingWizard defaults={defaults} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
