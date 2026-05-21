'use client';

import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteAccountAction, type DeleteAccountState } from './actions';

const initialState: DeleteAccountState = { ok: false };

export function DeleteAccountForm() {
  const t = useTranslations('Account');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor="confirm">{t('deleteConfirmLabel')}</Label>
        <Input
          id="confirm"
          name="confirm"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          required
          aria-invalid={state.error ? true : undefined}
          // Inline placeholder shows the exact word the user has to type.
          placeholder={t('deleteConfirmWord')}
        />
      </div>

      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border-2 border-danger/30 bg-danger/5 p-4"
        >
          <p className="text-base font-semibold text-danger">{t('deleteError')}</p>
        </div>
      )}

      <Button type="submit" variant="danger" className="w-full" disabled={pending}>
        {pending ? tc('loading') : t('deleteButton')}
      </Button>
    </form>
  );
}
