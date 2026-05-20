'use client';

import { useActionState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { signupAction } from '../login/actions';

type AuthErrorCode =
  | 'invalidCredentials'
  | 'wrongPassword'
  | 'accountNotFound'
  | 'userAlreadyExists'
  | 'weakPassword'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'serverError';
type AuthState = { ok: boolean; error?: AuthErrorCode };
const initialState: AuthState = { ok: false };

export function SignupForm() {
  const t = useTranslations('Auth');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-describedby="pw-hint"
        />
        <p id="pw-hint" className="mt-1 text-sm text-muted">
          {t('passwordHint')}
        </p>
      </div>

      {/* Trainer self-declaration. When ticked, profile.role is set to
          'trainer' on signup and the user lands on /trainer after signup
          instead of /plan. Senior-friendly checkbox: 24px box, label
          fully clickable, padding for 44px+ touch target. */}
      <label className="inline-flex items-start gap-3 text-base py-3 cursor-pointer">
        <input
          type="checkbox"
          name="is_trainer"
          value="true"
          className="h-6 w-6 mt-0.5 accent-brand cursor-pointer shrink-0"
        />
        <span className="flex-1">
          <span className="block font-semibold">{t('trainerLabel')}</span>
          <span className="block text-sm text-muted mt-0.5">{t('trainerHint')}</span>
        </span>
      </label>

      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border-2 border-danger/30 bg-danger/5 p-4"
        >
          <p className="text-base font-semibold text-danger">
            {t(`errors.${state.error}` as 'errors.invalidCredentials')}
          </p>
          {state.error === 'userAlreadyExists' && (
            <p className="mt-2 text-sm text-foreground/85">
              <Link
                href="/login"
                className="font-semibold text-brand hover:text-brand-dark underline underline-offset-2"
              >
                {t('errors.userAlreadyExistsCta')}
              </Link>
            </p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? tc('loading') : t('signupCta')}
      </Button>
    </form>
  );
}
