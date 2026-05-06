'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const labels: Record<Locale, string> = {
  en: 'English',
  pl: 'Polski',
  it: 'Italiano',
  uk: 'Українська',
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
        className="rounded-full border border-foreground/15 dark:border-foreground/20 bg-surface-2 px-3 py-2 text-sm font-medium text-foreground hover:border-foreground/30 hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 cursor-pointer"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {labels[l as Locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
