'use client';
import { useTranslations } from 'next-intl';
import { Lightbulb, Target, Trophy } from 'lucide-react';

type Props = {
  whyMatters: string | null;
  keyFocus: string[] | null;
  proTip: string | null;
  /** When true (e.g. for football users) opens the section by default. */
  defaultOpen?: boolean;
};

/**
 * Expandable coaching content for an exercise card. Renders why_matters /
 * key_focus / pro_tip from the exercises table. Returns null when none of
 * the three fields are populated, so non-football exercises stay clean.
 */
export function CoachingSection({ whyMatters, keyFocus, proTip, defaultOpen = false }: Props) {
  const t = useTranslations('Coaching');
  const hasFocus = Array.isArray(keyFocus) && keyFocus.length > 0;
  if (!whyMatters && !hasFocus && !proTip) return null;

  return (
    <details open={defaultOpen} className="mt-4 rounded-md border-2 border-border p-4">
      <summary className="font-medium cursor-pointer min-h-12 flex items-center text-base">
        {t('expand')}
      </summary>
      <div className="mt-3 space-y-4 text-base">
        {whyMatters && (
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 shrink-0 mt-1 text-amber-500" aria-hidden="true" />
            <div>
              <strong className="block">{t('whyMatters')}</strong>
              <p>{whyMatters}</p>
            </div>
          </div>
        )}
        {hasFocus && (
          <div className="flex gap-3">
            <Target className="w-5 h-5 shrink-0 mt-1 text-brand" aria-hidden="true" />
            <div>
              <strong className="block">{t('keyFocus')}</strong>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                {keyFocus?.map((f, i) => <li key={i}>{f}</li>)}
              </ol>
            </div>
          </div>
        )}
        {proTip && (
          <div className="flex gap-3">
            <Trophy className="w-5 h-5 shrink-0 mt-1 text-yellow-600" aria-hidden="true" />
            <div>
              <strong className="block">{t('proTip')}</strong>
              <p className="italic">{proTip}</p>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
