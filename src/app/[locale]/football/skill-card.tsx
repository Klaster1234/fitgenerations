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
  const youtubeId = exercise.video_url?.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;

  return (
    <article className="rounded-md border-2 border-border overflow-hidden bg-surface">
      {youtubeId && (
        <div className="aspect-video bg-surface">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={exercise.name}
            className="w-full h-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-medium">{exercise.name}</h3>
        <p className="text-sm text-muted">
          {exercise.duration_minutes} {minutesShort} · {categoryLabel}
        </p>
        <p className="text-base">{exercise.description}</p>
        <CoachingSection
          whyMatters={exercise.why_matters}
          keyFocus={exercise.key_focus}
          proTip={exercise.pro_tip}
          defaultOpen={false}
        />
      </div>
    </article>
  );
}
