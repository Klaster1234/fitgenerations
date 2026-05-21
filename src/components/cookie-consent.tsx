'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

const COOKIE_NAME = 'fgst-consent';
// One year is the standard ePrivacy lifetime for consent banners.
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readConsent(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function writeConsent(value: 'accepted' | 'essential') {
  if (typeof document === 'undefined') return;
  // `Secure` is fine because the app only ships over HTTPS in production;
  // localhost dev defaults are forgiving. `SameSite=Lax` keeps it on the
  // first-party domain only.
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(value)}; ` +
    `Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax; Secure`;
}

// `cookie` doesn't fire DOM events, so the subscribe step is a no-op. The
// component re-reads via the getSnapshot only when we explicitly trigger
// a manual re-render (which we do by calling setExternalVersion below
// after a writeConsent). useSyncExternalStore is the supported way to
// read a client-only value during render without tripping the React 19
// "no setState in effect" lint rule.
let listeners: Array<() => void> = [];
function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}
function notify() {
  listeners.forEach((l) => l());
}

/**
 * Cookie consent banner. Renders only when the consent cookie is missing.
 * Currently FGST runs no third-party analytics or marketing scripts, so
 * "Essential only" and "Accept all" both reduce to the same on-page
 * behaviour; the banner exists so we can wire trackers behind the
 * accepted-flag without UX rework when WP3 dissemination starts.
 */
export function CookieConsent() {
  // useSyncExternalStore returns the server snapshot (null) on SSR and the
  // real cookie value on the client. This avoids a hydration mismatch and
  // satisfies react-hooks/set-state-in-effect.
  const decision = useSyncExternalStore(
    subscribe,
    () => readConsent(),
    () => null,
  );

  const t = useTranslations('Consent');

  if (decision !== null) return null;

  const handleAccept = () => {
    writeConsent('accepted');
    notify();
  };

  const handleReject = () => {
    writeConsent('essential');
    notify();
  };

  return (
    <div
      role="dialog"
      aria-label={t('message')}
      aria-live="polite"
      className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:right-4 sm:bottom-4 z-50 max-w-md rounded-2xl border border-border bg-surface p-5 shadow-elevated"
    >
      <p className="text-sm leading-relaxed text-foreground">
        {t('message')}{' '}
        <Link
          href="/privacy"
          className="font-semibold text-brand hover:text-brand-dark underline underline-offset-2"
        >
          {t('privacyLink')}
        </Link>
      </p>
      <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleReject}
          className="w-full sm:flex-1"
        >
          {t('reject')}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleAccept}
          className="w-full sm:flex-1"
        >
          {t('accept')}
        </Button>
      </div>
    </div>
  );
}
