import { Download } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

/**
 * GDPR data portability. The "Generate export" button is a plain HTML form
 * that POSTs to /api/account/export - the Route Handler streams a JSON file
 * back with Content-Disposition: attachment, so the browser triggers a
 * native download. We deliberately don't use a Server Action here: a Server
 * Action's return value is RSC-encoded, which makes it awkward to deliver
 * an `application/json` attachment without a client-side blob shim.
 */
export default async function ExportAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;

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
              {t('exportTitle')}
            </h1>
            <p className="mt-3 text-lg text-muted text-pretty">{t('exportIntro')}</p>
          </header>

          <Card className="shadow-card border-border/60">
            <CardContent className="p-7 sm:p-8">
              <form action="/api/account/export" method="post" className="space-y-5">
                <Button type="submit" className="w-full">
                  <Download className="w-5 h-5" strokeWidth={2.25} aria-hidden />
                  {t('exportButton')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
