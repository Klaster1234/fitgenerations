import { getTranslations } from 'next-intl/server';

/**
 * Localized loading fallback shown while async server components fetch
 * data (Supabase queries, Claude calls). Replaces Next's default blank.
 *
 * Static skeleton + accessible loading announcement. No animation by
 * default - reduced-motion users would see a flicker without this.
 */
export default async function LocaleLoading() {
  const t = await getTranslations('Common');

  return (
    <main
      className="flex-1 flex items-center justify-center px-6 py-20"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <div
          className="mx-auto h-12 w-12 rounded-full border-4 border-brand/30 border-t-brand motion-safe:animate-spin"
          aria-hidden
        />
        <p className="mt-6 text-lg font-semibold text-muted">{t('loading')}</p>
      </div>
    </main>
  );
}
