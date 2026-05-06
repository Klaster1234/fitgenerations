import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { cn } from '@/lib/utils';

// Tailwind 4 utilities derive from CSS variables (see globals.css).
// Primary uses dark text on bright green for WCAG AA contrast (audit fix).
const buttonVariants = cva(
  // Base: 48px min height for senior-friendly touch targets, focus ring, font-bold.
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // 5:1 contrast on emerald-500 (passes WCAG AA), hover lightens for tactile feel
        primary: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-soft hover:shadow-card',
        secondary: 'border-2 border-foreground/20 text-foreground hover:border-brand hover:text-brand',
        ghost: 'text-foreground hover:bg-surface',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-10 px-4 text-sm rounded-full',
        md: 'h-12 px-6 text-base rounded-full',
        lg: 'h-14 px-8 text-lg rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
