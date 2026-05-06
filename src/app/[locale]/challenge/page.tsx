import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/app-header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { SubmitForm } from './submit-form';

export default async function ChallengePage({
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

  const { data: videos } = await supabase
    .from('challenge_videos')
    .select('id, url, caption, created_at, user_id')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(30);

  const t = await getTranslations('Challenge');

  type Video = { id: string; url: string; caption: string | null; created_at: string };
  const list = (videos as Video[] | null) ?? [];

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">#SmartMoveChallenge</h1>
          <p className="mt-2 text-muted text-base leading-relaxed">{t('intro')}</p>
        </header>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">{t('submitTitle')}</h2>
          <Card className="mt-3">
            <CardContent className="p-6">
              <SubmitForm />
            </CardContent>
          </Card>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">{t('feedTitle')}</h2>
          {list.length === 0 ? (
            <Card className="mt-3">
              <CardContent className="p-6 text-muted text-center">
                {t('feedEmpty')}
              </CardContent>
            </Card>
          ) : (
            <ul className="mt-3 grid sm:grid-cols-2 gap-3">
              {list.map((v) => {
                let host = '';
                try {
                  host = new URL(v.url).host.replace(/^www\./, '');
                } catch {
                  host = '';
                }
                return (
                  <li key={v.id}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{host}</CardTitle>
                          <span className="text-xs text-muted">
                            {new Date(v.created_at).toLocaleDateString(locale)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {v.caption && <p className="text-base mb-3">{v.caption}</p>}
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm font-semibold text-brand hover:text-brand-dark underline break-all"
                        >
                          ▸ {t('watchCta')}
                        </a>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
