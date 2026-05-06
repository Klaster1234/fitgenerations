import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

export default async function BadgesPage({
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

  const [{ data: allBadges }, { data: ownedRows }] = await Promise.all([
    supabase.from('badges').select('id, slug, name, description, icon, criteria').order('slug'),
    supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', userId),
  ]);

  const earned = new Map(
    (ownedRows ?? []).map((r) => [r.badge_id as string, r.earned_at as string]),
  );

  type Badge = {
    id: string;
    slug: string;
    name: Record<string, string>;
    description: Record<string, string>;
    icon: string;
  };

  const badges = (allBadges as Badge[] | null) ?? [];
  const earnedBadges = badges.filter((b) => earned.has(b.id));
  const lockedBadges = badges.filter((b) => !earned.has(b.id));

  const t = await getTranslations('Badges');

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted">
          {t('summary', { earned: earnedBadges.length, total: badges.length })}
        </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t('earned')}</h2>
        {earnedBadges.length === 0 ? (
          <p className="mt-3 text-muted">{t('emptyEarned')}</p>
        ) : (
          <ul className="mt-3 grid sm:grid-cols-2 gap-3">
            {earnedBadges.map((b) => (
              <li key={b.id}>
                <Card>
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="text-3xl" aria-hidden>
                      {b.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-base">{b.name[locale] ?? b.name.en}</p>
                      <p className="text-sm text-muted mt-1">
                        {b.description[locale] ?? b.description.en}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">{t('locked')}</h2>
        {lockedBadges.length === 0 ? (
          <p className="mt-3 text-muted">{t('allEarned')}</p>
        ) : (
          <ul className="mt-3 grid sm:grid-cols-2 gap-3">
            {lockedBadges.map((b) => (
              <li key={b.id}>
                <Card className="opacity-60">
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="text-3xl grayscale" aria-hidden>
                      {b.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-base">{b.name[locale] ?? b.name.en}</p>
                      <p className="text-sm text-muted mt-1">
                        {b.description[locale] ?? b.description.en}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
        </section>
      </main>
    </>
  );
}
