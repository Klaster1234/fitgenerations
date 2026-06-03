'use client';
import { useTranslations } from 'next-intl';
import { Lightbulb, Target, Trophy, ChevronRight } from 'lucide-react';

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
 *
 * Collapsed state is a light "chevron + label" toggle (no heavy bordered box);
 * the content reveals on a subtle surface panel when opened.
 */
export function CoachingSection({ whyMatters, keyFocus, proTip, defaultOpen = false }: Props) {
  const t = useTranslations('Coaching');
  const hasFocus = Array.isArray(keyFocus) && keyFocus.length > 0;
  if (!whyMatters && !hasFocus && !proTip) return null;

  return (
    <details open={defaultOpen} className="group mt-3">
      <summary className="flex items-center gap-1.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden min-h-11 text-sm font-semibold text-brand-darker dark:text-brand">
        <ChevronRight
          className="w-4 h-4 shrink-0 transition-transform duration-200 group-open:rotate-90"
          strokeWidth={2.5}
          aria-hidden="true"
        />
        {t('expand')}
      </summary>
      <div className="mt-2 space-y-3 rounded-md bg-surface-2 p-3 text-sm leading-relaxed">
        {whyMatters && (
          <div className="flex gap-2.5">
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
            <p>
              <strong className="text-foreground">{t('whyMatters')}: </strong>
              {whyMatters}
            </p>
          </div>
        )}
        {hasFocus && (
          <div className="flex gap-2.5">
            <Target className="w-4 h-4 shrink-0 mt-0.5 text-brand" aria-hidden="true" />
            <div>
              <strong className="text-foreground">{t('keyFocus')}:</strong>
              <ol className="list-decimal list-inside space-y-0.5 mt-0.5 text-muted">
                {keyFocus?.map((f, i) => <li key={i}>{f}</li>)}
              </ol>
            </div>
          </div>
        )}
        {proTip && (
          <div className="flex gap-2.5">
            <Trophy className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" aria-hidden="true" />
            <p>
              <strong className="text-foreground">{t('proTip')}: </strong>
              <span className="italic">{proTip}</span>
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
