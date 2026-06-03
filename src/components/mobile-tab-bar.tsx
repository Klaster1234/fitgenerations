'use client';

import { Activity, History, Trophy, Sparkles, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Fixed bottom tab bar shown only on mobile (< sm).
 * Thumb-reach targets at the bottom of the viewport. Hidden on tablet+ where
 * the inline top nav has the same items.
 *
 * Football users get a 5th tab for the Skills Library, because on mobile the
 * top-nav football link is hidden and this is their only way to reach it.
 *
 * `pb-[env(safe-area-inset-bottom)]` adds room for the iOS home indicator so
 * the labels don't get clipped on iPhones.
 */
type Tab = {
  href: '/plan' | '/history' | '/badges' | '/challenge' | '/football';
  key: 'plan' | 'history' | 'badges' | 'challenge' | 'football';
  icon?: LucideIcon;
  emoji?: string;
};

const BASE_TABS: Tab[] = [
  { href: '/plan', icon: Activity, key: 'plan' },
  { href: '/history', icon: History, key: 'history' },
  { href: '/badges', icon: Trophy, key: 'badges' },
  { href: '/challenge', icon: Sparkles, key: 'challenge' },
];

const FOOTBALL_TAB: Tab = { href: '/football', emoji: '⚽', key: 'football' };

export function MobileTabBar({ showFootball = false }: { showFootball?: boolean }) {
  const t = useTranslations('Nav');
  const pathname = usePathname();

  const tabs = showFootball ? [...BASE_TABS, FOOTBALL_TAB] : BASE_TABS;

  return (
    <nav
      aria-label={t('mainNav')}
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className={showFootball ? 'grid grid-cols-5' : 'grid grid-cols-4'}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-16 text-xs font-bold tracking-tight transition-colors ${
                  isActive
                    ? 'text-brand-darker dark:text-brand'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {Icon ? (
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.75 : 2} aria-hidden />
                ) : (
                  <span className="text-2xl leading-6 h-6 flex items-center" aria-hidden>
                    {tab.emoji}
                  </span>
                )}
                <span>{t(tab.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
