import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { OnboardingWizard, type OnboardingDefaults } from '../onboarding/wizard';

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
    .select('age, fitness_level, equipment, goals, city, trains_with_partner, group_code')
    .eq('id', userData.user!.id)
    .maybeSingle();

  const defaults: OnboardingDefaults = {
    age: profile?.age ?? null,
    fitness_level: (profile?.fitness_level as OnboardingDefaults['fitness_level']) ?? null,
    equipment: (profile?.equipment as string[] | null) ?? null,
    goals: (profile?.goals as string[] | null) ?? null,
    city: profile?.city ?? null,
    trains_with_partner: profile?.trains_with_partner ?? null,
    group_code: profile?.group_code ?? null,
  };

  const t = await getTranslations('Settings');

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

        <Card className="shadow-card border-border/60">
          <CardContent className="p-7 sm:p-8">
            <OnboardingWizard defaults={defaults} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
