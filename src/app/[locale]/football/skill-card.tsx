'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CoachingSection } from '@/components/coaching-section';

type Exercise = {
  slug: string;
  category: string;
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
};

export function SkillCard({ exercise, categoryLabel, minutesShort }: Props) {
  const t = useTranslations('Football');
  const youtubeId =
    exercise.video_url?.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
  const [playing, setPlaying] = useState(false);

  return (
    <article className="flex flex-col h-full rounded-md border-2 border-border overflow-hidden bg-surface">
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
            // asked) and gives every card a uniform thumbnail instead of a mix
            // of loaded frames and black boxes.
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
        <p className="mt-1 text-sm text-muted">
          {exercise.duration_minutes} {minutesShort} · {categoryLabel}
        </p>
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
