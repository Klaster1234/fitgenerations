'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Localized error boundary for everything under /[locale]/*.
 *
 * Replaces Next's default ENGLISH error page when something throws in a
 * server component (e.g. Supabase unreachable on /plan, AI generation
 * failure that escapes the baseline fallback). The reset() callback lets
 * the user retry in place without a full reload.
 *
 * Per Next 16 conventions this MUST be a client component - the error
 * receives a serialized digest so we never expose stack traces to users.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Errors');
  const tc = useTranslations('Common');

  useEffect(() => {
    // Forward to Sentry / Vercel logs once wired. Console for now.
    console.error('[locale/error]', error);
  }, [error]);

  return (
    <main
      className="flex-1 flex items-center justify-center px-6 py-20"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-brand" aria-hidden>
          !
        </p>
        <h1 className="mt-4 text-2xl font-semibold">{t('default')}</h1>
        {error.digest && (
          <p className="mt-2 text-sm text-muted">ref: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center min-h-12 px-5 py-3 rounded-full bg-brand text-white font-semibold hover:bg-brand-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            {tc('retry')}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-12 px-5 py-3 rounded-full border border-foreground/20 text-foreground font-semibold hover:bg-surface-2 transition-colors"
          >
            {t('notFoundBack')}
          </Link>
        </div>
      </div>
    </main>
  );
}
