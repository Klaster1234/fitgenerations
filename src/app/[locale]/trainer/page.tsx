import { Plus, Users, ExternalLink } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { Link } from '@/i18n/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

type Group = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  created_at: string;
};

/**
 * Trainer dashboard. Lists groups owned by the current trainer + "Create new
 * group" CTA. Gated by profile.role = 'trainer'. Anonymous visitors and
 * participants get redirected with a hint to upgrade their account.
 */
export default async function TrainerDashboardPage({
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

  // Read role from profile. Anonymous users have role='participant' by
  // default; only signed-up users who self-declared can access this page.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user!.id)
    .maybeSingle();

  const isTrainer = profile?.role === 'trainer';
  const isAnonymous = !userData.user!.email;

  const t = await getTranslations('Trainer');

  // Non-trainer users see an upgrade prompt instead of the dashboard.
  if (!isTrainer) {
    return (
      <>
        <AppHeader />
        <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
          <header className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {t('upgradeTitle')}
            </h1>
            <p className="mt-3 text-lg text-muted text-pretty leading-relaxed">
              {t('upgradeBody')}
            </p>
          </header>

          <Card>
            <CardContent className="p-6">
              {isAnonymous ? (
                <>
                  <p className="text-base leading-relaxed mb-5">{t('upgradeAnonHint')}</p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center min-h-12 px-6 py-3 rounded-pill bg-emerald-500 text-emerald-950 font-bold text-base shadow-soft hover:bg-emerald-400 transition-all"
                  >
                    {t('upgradeAnonCta')}
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-base leading-relaxed mb-5">{t('upgradeParticipantHint')}</p>
                  <p className="text-sm text-muted">{t('upgradeContactSupport')}</p>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  // Trainer dashboard — list their owned groups + Create CTA.
  const { data: rawGroups } = await supabase
    .from('groups')
    .select('id, code, name, city, created_at')
    .eq('owner_id', userData.user!.id)
    .order('created_at', { ascending: false });

  const groups = (rawGroups as Group[] | null) ?? [];

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('dashboardTitle')}</h1>
            <p className="mt-2 text-muted text-base leading-relaxed">
              {t('dashboardLede', { count: groups.length })}
            </p>
          </div>
          <Link
            href="/trainer/new"
            className="inline-flex items-center gap-2 min-h-12 px-5 py-3 rounded-pill bg-emerald-500 text-emerald-950 font-bold text-base shadow-soft hover:bg-emerald-400 transition-all whitespace-nowrap"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} aria-hidden />
            <span>{t('createCta')}</span>
          </Link>
        </header>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted" strokeWidth={1.5} aria-hidden />
              <p className="text-lg font-semibold mb-2">{t('emptyTitle')}</p>
              <p className="text-base text-muted leading-relaxed">{t('emptyHint')}</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/group/${g.code}`} className="block group">
                  <Card className="border-2 hover:border-brand/40 transition-colors">
                    <CardContent className="p-5 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold tracking-tight">{g.name}</p>
                        <p className="mt-1 text-sm text-muted">
                          {t('groupLabelCode')}: <code className="font-mono">{g.code}</code>
                          {g.city && (
                            <>
                              {' · '}
                              {g.city}
                            </>
                          )}
                        </p>
                      </div>
                      <ExternalLink
                        className="w-5 h-5 text-muted group-hover:text-brand transition-colors shrink-0 mt-1"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-12 rounded-card border-2 border-brand/20 bg-brand-light/30 dark:bg-brand/10 p-6">
          <h2 className="text-lg font-bold mb-3">{t('howTitle')}</h2>
          <ol className="space-y-2 text-base leading-relaxed list-decimal pl-5">
            <li>{t('howStep1')}</li>
            <li>{t('howStep2')}</li>
            <li>{t('howStep3')}</li>
            <li>{t('howStep4')}</li>
          </ol>
        </section>
      </main>
    </>
  );
}
