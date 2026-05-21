import { setRequestLocale } from 'next-intl/server';
import { AuthHeader } from '@/components/auth-header';
import { TutorialView } from './tutorial-view';

/**
 * 3-slide tutorial route. No auth check — anyone can land here, even
 * before the proxy.ts has created an anonymous session. We don't gate
 * on `onboarded_at` either: the user might want to re-read the intro
 * from a bookmark or footer link.
 *
 * After the last slide the "Continue" button links to /onboarding.
 */
export default async function TutorialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-hero-gradient flex-1 flex flex-col">
      <AuthHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <TutorialView />
      </main>
    </div>
  );
}
