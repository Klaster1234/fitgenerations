'use client';

import { useActionState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from './actions';

type AuthState = { ok: boolean; error?: string; notice?: string };
const initialState: AuthState = { ok: false };

export function LoginForm() {
  const t = useTranslations('Auth');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger" aria-live="polite">
          {t(state.error as 'invalidCredentials')}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? tc('loading') : t('loginCta')}
      </Button>
    </form>
  );
}
