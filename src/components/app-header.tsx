import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { LogoutButton } from './logout-button';

/**
 * Header for authenticated pages. Renders nav + locale switcher + logout.
 * Drop at the top of every page inside the (app) flow.
 */
export async function AppHeader() {
  const t = await getTranslations('Nav');
  const tc = await getTranslations('Common');

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <Link href="/plan" className="font-bold text-base text-brand-dark hover:text-brand">
          <span aria-hidden>FGST</span>
          <span className="sr-only">{tc('appName')}</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/plan"
            className="px-3 py-1.5 rounded-full font-medium hover:bg-surface"
          >
            {t('plan')}
          </Link>
          <Link
            href="/history"
            className="px-3 py-1.5 rounded-full font-medium hover:bg-surface"
          >
            {t('history')}
          </Link>
          <Link
            href="/badges"
            className="px-3 py-1.5 rounded-full font-medium hover:bg-surface"
          >
            {t('badges')}
          </Link>
          <Link
            href="/challenge"
            className="px-3 py-1.5 rounded-full font-medium hover:bg-surface"
          >
            {t('challenge')}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
