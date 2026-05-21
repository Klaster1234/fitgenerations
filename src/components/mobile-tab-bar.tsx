'use client';

import { Activity, History, Trophy, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Fixed bottom tab bar shown only on mobile (< sm).
 * Industry-standard pattern: 4 thumb-reach targets at the bottom of the
 * viewport. Hidden on tablet+ where the inline top nav has the same items.
 *
 * `pb-[env(safe-area-inset-bottom)]` adds room for the iOS home indicator
 * so the labels don't get clipped on iPhones.
 */
const TABS = [
  { href: '/plan' as const, icon: Activity, key: 'plan' as const },
  { href: '/history' as const, icon: History, key: 'history' as const },
  { href: '/badges' as const, icon: Trophy, key: 'badges' as const },
  { href: '/challenge' as const, icon: Sparkles, key: 'challenge' as const },
];

export function MobileTabBar() {
  const t = useTranslations('Nav');
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('mainNav')}
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-16 text-sm font-bold tracking-tight transition-colors ${
                  isActive
                    ? 'text-brand-darker dark:text-brand'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <Icon
                  className="w-6 h-6"
                  strokeWidth={isActive ? 2.75 : 2}
                  aria-hidden
                />
                <span>{t(tab.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
