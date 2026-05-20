import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { Link } from '@/i18n/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { CreateGroupForm } from './create-group-form';

/**
 * Trainer "Create group" form. Server-side checks role === 'trainer' so a
 * participant cannot brute-force this URL.
 */
export default async function NewGroupPage({
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
    .select('role')
    .eq('id', userData.user!.id)
    .maybeSingle();
  if (profile?.role !== 'trainer') {
    redirect({ href: '/trainer', locale });
  }

  const t = await getTranslations('Trainer');

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-xl mx-auto w-full">
        <Link
          href="/trainer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          <span>{t('backToDashboard')}</span>
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            {t('createTitle')}
          </h1>
          <p className="mt-3 text-lg text-muted text-pretty leading-relaxed">
            {t('createSubtitle')}
          </p>
        </header>

        <Card className="shadow-card border-border/60">
          <CardContent className="p-7 sm:p-8">
            <CreateGroupForm />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
