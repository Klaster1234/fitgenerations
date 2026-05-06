'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { markExerciseDone, type MarkDoneState } from './done-action';

const initialState: MarkDoneState = { ok: false };

type Props = {
  planId: string;
  exerciseSlug: string;
  durationMinutes: number;
  alreadyDone: boolean;
  onEarned?: (slugs: string[]) => void;
};

export function DoneButton({
  planId,
  exerciseSlug,
  durationMinutes,
  alreadyDone,
  onEarned,
}: Props) {
  const t = useTranslations('Plan');
  const tc = useTranslations('Common');
  const [state, formAction, pending] = useActionState(markExerciseDone, initialState);

  useEffect(() => {
    if (state.ok && state.earned && state.earned.length > 0 && onEarned) {
      onEarned(state.earned);
    }
  }, [state, onEarned]);

  if (alreadyDone || state.ok) {
    return (
      <span
        className="inline-flex items-center gap-2 text-sm font-semibold text-success"
        aria-live="polite"
      >
        ✓ {t('doneToast')}
      </span>
    );
  }

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="plan_id" value={planId} />
      <input type="hidden" name="exercise_slug" value={exerciseSlug} />
      <input type="hidden" name="duration_minutes" value={durationMinutes} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? tc('loading') : t('doneCta')}
      </Button>
    </form>
  );
}
