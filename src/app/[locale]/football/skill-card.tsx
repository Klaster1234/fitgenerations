'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CoachingSection } from '@/components/coaching-section';

type Exercise = {
  slug: string;
  category: string;
  difficulty: 'low' | 'mid' | 'high';
  name: string;
  description: string;
  video_url: string | null;
  duration_minutes: number;
  why_matters: string | null;
  key_focus: string[] | null;
  pro_tip: string | null;
};

type Props = {
  exercise: Exercise;
  categoryLabel: string;
  minutesShort: string;
  featured?: boolean;
};

const DIFF_STYLE: Record<Exercise['difficulty'], string> = {
  low: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  mid: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  high: 'bg-rose-500/15 text-rose-400 ring-rose-500/30',
};
const DIFF_LABEL: Record<Exercise['difficulty'], 'levelLow' | 'levelMid' | 'levelHigh'> = {
  low: 'levelLow',
  mid: 'levelMid',
  high: 'levelHigh',
};

export function SkillCard({ exercise, categoryLabel, minutesShort, featured = false }: Props) {
  const t = useTranslations('Football');
  const youtubeId =
    exercise.video_url?.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
  const [playing, setPlaying] = useState(false);

  return (
    <article
      className={`flex flex-col h-full rounded-xl border-2 overflow-hidden bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        featured ? 'border-amber-500/30 hover:border-amber-400/60' : 'border-border hover:border-brand/40'
      }`}
    >
      {youtubeId && (
        <div className="aspect-video bg-black">
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title={exercise.name}
              className="w-full h-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            // Click-to-play poster: keeps the page light (no live iframe until
            // asked) and gives every card a uniform thumbnail.
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`${t('playVideo')}: ${exercise.name}`}
              className="group relative block w-full h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/0 transition-colors">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 group-hover:bg-red-600 transition-colors">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </button>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-medium">{exercise.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${DIFF_STYLE[exercise.difficulty]}`}
          >
            {t(DIFF_LABEL[exercise.difficulty])}
          </span>
          <span>
            {exercise.duration_minutes} {minutesShort} · {categoryLabel}
          </span>
        </div>
        <p className="mt-2 text-base line-clamp-4">{exercise.description}</p>
        <div className="mt-auto pt-2">
          <CoachingSection
            whyMatters={exercise.why_matters}
            keyFocus={exercise.key_focus}
            proTip={exercise.pro_tip}
            defaultOpen={false}
          />
        </div>
      </div>
    </article>
  );
}
