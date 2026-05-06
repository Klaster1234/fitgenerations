import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { OnboardingWizard } from './wizard';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect({ href: '/login', locale: locale as 'en' | 'pl' | 'it' });
  }

  const t = await getTranslations('Onboarding');

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <p className="mt-2 text-muted">{t('subtitle')}</p>
          </CardHeader>
          <CardContent>
            <OnboardingWizard />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
