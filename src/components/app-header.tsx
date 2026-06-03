import { Settings, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Logo } from './logo';
import { LocaleSwitcher } from './locale-switcher';
import { LogoutButton } from './logout-button';
import { MobileTabBar } from './mobile-tab-bar';

/**
 * Header for authenticated pages. Renders nav + locale switcher + auth
 * affordance. The right-hand action depends on the visitor's account state:
 *   • Anonymous (no email)  → "Zapisz postęp" → /signup (upgrades the session)
 *   • Permanent (has email) → "Wyloguj"
 *
 * Drop at the top of every page inside the (app) flow.
 */
export async function AppHeader() {
  const t = await getTranslations('Nav');
  const tc = await getTranslations('Common');

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const isAnonymous = !userData.user?.email;

  // Trainer-only links surface only when profile.role === 'trainer'.
  // Football link surfaces only when profile.interests includes 'football'.
  // Single round-trip — we already have a session, this is one row by PK.
  let isTrainer = false;
  let isFootball = false;
  if (userData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, interests')
      .eq('id', userData.user.id)
      .maybeSingle();
    isTrainer = profile?.role === 'trainer';
    const interests = (profile?.interests as string[] | null) ?? [];
    isFootball = interests.includes('football');
  }

  return (
    <>
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3">
          <Link
            href="/plan"
            className="hover:opacity-80 transition-opacity shrink-0"
            aria-label={tc('appName')}
          >
            <Logo size="sm" />
          </Link>

          {/* Desktop nav - hidden on mobile, the bottom tab bar takes over there */}
          <nav className="hidden sm:flex items-center gap-0.5 text-base">
            <Link
              href="/plan"
              className="inline-flex items-center min-h-12 px-4 py-2 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
            >
              {t('plan')}
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center min-h-12 px-4 py-2 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
            >
              {t('history')}
            </Link>
            <Link
              href="/badges"
              className="inline-flex items-center min-h-12 px-4 py-2 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
            >
              {t('badges')}
            </Link>
            <Link
              href="/challenge"
              className="inline-flex items-center min-h-12 px-4 py-2 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
            >
              {t('challenge')}
            </Link>
            {isFootball && (
              <Link
                href="/football"
                className="inline-flex items-center gap-1.5 min-h-12 px-4 py-2 rounded-pill font-semibold hover:bg-surface-2 transition-colors"
              >
                <span aria-hidden>⚽</span>
                <span>{t('football')}</span>
              </Link>
            )}
            {isTrainer && (
              <Link
                href="/trainer"
                className="inline-flex items-center gap-1.5 min-h-12 px-4 py-2 rounded-pill font-semibold text-brand-darker dark:text-brand hover:bg-surface-2 transition-colors"
              >
                <Users className="w-4 h-4" strokeWidth={2.25} aria-hidden />
                <span>{t('groups')}</span>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/settings"
              aria-label={t('settings')}
              title={t('settings')}
              className="inline-flex items-center justify-center min-h-12 min-w-12 rounded-pill text-foreground hover:bg-surface-2 transition-colors"
            >
              <Settings className="w-5 h-5" strokeWidth={2.25} aria-hidden />
            </Link>
            <LocaleSwitcher />
            {isAnonymous ? (
              <Link
                href="/signup"
                className="inline-flex items-center min-h-12 px-3 sm:px-4 py-2 rounded-pill bg-emerald-500 text-emerald-950 font-bold text-sm sm:text-base shadow-soft hover:bg-emerald-400 transition-all whitespace-nowrap"
              >
                {t('saveProgress')}
              </Link>
            ) : (
              <LogoutButton />
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar - only renders on < sm. Football users get a
          5th tab for the Skills Library (the top-nav link is hidden on mobile). */}
      <MobileTabBar showFootball={isFootball} />
    </>
  );
}
