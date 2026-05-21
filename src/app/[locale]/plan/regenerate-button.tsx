'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function RegenerateButton() {
  const t = useTranslations('Plan');
  const tc = useTranslations('Common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Inline error so the user knows WHY nothing visibly changed (e.g.
  // 429 rate limit, 500 catalogue_unavailable). Without this the previous
  // implementation called router.refresh() unconditionally, which silently
  // re-rendered the same plan and felt like the button was dead.
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const res = await fetch('/api/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regenerate: true }),
              });
              if (!res.ok) {
                if (res.status === 429) {
                  const data = await res.json().catch(() => ({}));
                  setError(t('regenerateRateLimited', { seconds: data.retryAfter ?? 60 }));
                } else {
                  setError(t('regenerateFailed'));
                }
                return;
              }
              router.refresh();
            } catch {
              setError(t('regenerateFailed'));
            }
          });
        }}
      >
        {pending ? tc('loading') : t('regenerateCta')}
      </Button>
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm font-semibold text-danger text-center max-w-md"
        >
          {error}
        </p>
      )}
    </div>
  );
}
