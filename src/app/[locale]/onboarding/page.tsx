import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AuthHeader } from '@/components/auth-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { OnboardingWizard } from './wizard';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect({ href: '/login', locale });
  }

  const t = await getTranslations('Onboarding');

  return (
    <div className="bg-hero-gradient flex-1 flex flex-col">
      <AuthHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('title')}
            </h1>
            <p className="mt-3 text-lg text-muted text-pretty">{t('subtitle')}</p>
          </div>

          <Card className="shadow-card border-border/60">
            <CardContent className="p-7 sm:p-8">
              <OnboardingWizard />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
