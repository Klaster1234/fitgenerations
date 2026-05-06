import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 'uk' = Ukrainian — added explicitly per Erasmus inclusion goal
  // (proposal mentions refugees and people with fewer opportunities).
  locales: ['en', 'pl', 'it', 'uk'],
  defaultLocale: 'en',
  // Always show locale prefix in URL: /en, /pl, /it. Clearer for users + SEO across PL/IT/EN.
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
