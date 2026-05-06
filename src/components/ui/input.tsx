import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        // 48px min height, large readable text. Strong focus state.
        // Visible border + slightly recessed bg for clear input affordance (audit fix).
        // Senior-friendly: stronger dark-mode border so the field is
        // visibly clickable without hovering (audit fix).
        'flex h-12 w-full rounded-xl border-2 border-foreground/20 dark:border-foreground/35 bg-surface-2 px-4 py-2 text-base text-foreground shadow-sm placeholder:text-muted',
        'hover:border-foreground/40 dark:hover:border-foreground/50 transition-colors',
        // Single clean ring on focus (no border swap → no "double-ring" look).
        'outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:bg-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/30',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
