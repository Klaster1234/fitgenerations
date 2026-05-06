'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitChallengeVideo, type SubmitState } from './actions';

const initialState: SubmitState = { ok: false };

export function SubmitForm() {
  const t = useTranslations('Challenge');
  const tc = useTranslations('Common');
  const [state, formAction, pending] = useActionState(submitChallengeVideo, initialState);

  if (state.ok) {
    return (
      <p className="p-4 rounded-xl bg-brand-light text-brand-dark text-base" role="status">
        {t('submitted')}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="url">{t('urlLabel')}</Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://youtube.com/shorts/..."
          required
        />
        <p className="mt-1 text-sm text-muted">{t('urlHint')}</p>
      </div>

      <div>
        <Label htmlFor="caption">{t('captionLabel')}</Label>
        <Input id="caption" name="caption" type="text" maxLength={280} />
      </div>

      {/* Senior-friendly checkbox: label is fully clickable (browser default),
          padding bumped for 44px+ touch target, text bumped to base. */}
      <label className="inline-flex items-center gap-3 text-base py-3 cursor-pointer">
        <input
          type="checkbox"
          name="isPublic"
          value="true"
          defaultChecked
          className="h-6 w-6 accent-brand cursor-pointer"
        />
        <span>{t('publicLabel')}</span>
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger" aria-live="polite">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? tc('loading') : t('submitCta')}
      </Button>
    </form>
  );
}
