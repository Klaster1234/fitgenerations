import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Logo } from './logo';
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
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link
          href="/plan"
          className="hover:opacity-80 transition-opacity shrink-0"
          aria-label={tc('appName')}
        >
          <Logo size="sm" />
        </Link>

        <nav className="flex items-center gap-0.5 text-sm flex-wrap">
          <Link
            href="/plan"
            className="px-3 py-1.5 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
          >
            {t('plan')}
          </Link>
          <Link
            href="/history"
            className="px-3 py-1.5 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
          >
            {t('history')}
          </Link>
          <Link
            href="/badges"
            className="px-3 py-1.5 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
          >
            {t('badges')}
          </Link>
          <Link
            href="/challenge"
            className="px-3 py-1.5 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
          >
            {t('challenge')}
          </Link>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <LocaleSwitcher />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
