import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { DeleteAccountForm } from './delete-form';

export default async function DeleteAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;

  // Guard: an anonymous visitor has no account to delete. Send them home.
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || userData.user.is_anonymous) {
    redirect({ href: '/', locale });
  }

  const t = await getTranslations('Account');

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <header className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('deleteTitle')}
            </h1>
            <p className="mt-3 text-lg text-muted text-pretty">{t('deleteIntro')}</p>
          </header>

          <div
            role="alert"
            className="mb-8 rounded-xl border-2 border-danger/40 bg-danger/5 p-5"
          >
            <p className="text-base font-semibold text-danger">{t('deleteWarning')}</p>
          </div>

          <Card className="shadow-card border-border/60">
            <CardContent className="p-7 sm:p-8">
              <DeleteAccountForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
