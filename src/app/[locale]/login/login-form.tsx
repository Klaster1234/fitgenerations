'use client';

import { useActionState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { loginAction } from './actions';

type AuthErrorCode =
  | 'invalidCredentials'
  | 'wrongPassword'
  | 'accountNotFound'
  | 'userAlreadyExists'
  | 'weakPassword'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'serverError';
type AuthState = { ok: boolean; error?: AuthErrorCode; notice?: string };
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
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border-2 border-danger/30 bg-danger/5 p-4"
        >
          <p className="text-base font-semibold text-danger">
            {t(`errors.${state.error}` as 'errors.invalidCredentials')}
          </p>
          {state.error === 'accountNotFound' && (
            <p className="mt-2 text-sm text-foreground/85">
              <Link
                href="/signup"
                className="font-semibold text-brand hover:text-brand-dark underline underline-offset-2"
              >
                {t('errors.accountNotFoundCta')}
              </Link>
            </p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? tc('loading') : t('loginCta')}
      </Button>
    </form>
  );
}
