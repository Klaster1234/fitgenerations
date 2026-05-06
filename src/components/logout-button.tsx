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
      className="text-sm font-medium text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-surface disabled:opacity-50"
      aria-label={tn('logout')}
    >
      {tn('logout')}
    </button>
  );
}
