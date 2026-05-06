import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

const dimensions: Record<Size, { box: string; icon: string; text: string }> = {
  sm: { box: 'w-7 h-7', icon: 'w-3.5 h-3.5', text: 'text-sm' },
  md: { box: 'w-9 h-9', icon: 'w-4 h-4', text: 'text-base' },
  lg: { box: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-2xl' },
};

/**
 * FGST logo. Inline SVG / icon only — no image asset dependency.
 * The lightning bolt visually conveys "smart" / "energy" / "movement".
 */
export function Logo({ size = 'md', className }: { size?: Size; className?: string }) {
  const d = dimensions[size];
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold', d.text, className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-xl bg-brand text-white shadow-soft',
          d.box,
        )}
        aria-hidden
      >
        <Zap className={d.icon} strokeWidth={2.5} />
      </span>
      <span className="text-brand-darker">FGST</span>
    </span>
  );
}
