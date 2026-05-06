'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function RegenerateButton() {
  const t = useTranslations('Plan');
  const tc = useTranslations('Common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regenerate: true }),
          });
          router.refresh();
        });
      }}
    >
      {pending ? tc('loading') : t('regenerateCta')}
    </Button>
  );
}
