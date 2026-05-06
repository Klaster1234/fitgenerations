import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { cn } from '@/lib/utils';

// Tailwind 4 utilities derive from CSS variables (see globals.css).
const buttonVariants = cva(
  // Base: 48px min height for senior-friendly touch targets, focus ring, font-semibold.
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-dark',
        secondary: 'border-2 border-brand text-brand hover:bg-brand/5',
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
