'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { logoutAction } from '@/app/[locale]/login/actions';

export function LogoutButton() {
  const tn = useTranslations('Nav');
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={pending}
      className="inline-flex items-center min-h-12 text-base font-semibold text-muted hover:text-foreground transition-colors px-4 py-2 rounded-pill hover:bg-surface disabled:opacity-50"
      aria-label={tn('logout')}
    >
      {tn('logout')}
    </button>
  );
}
