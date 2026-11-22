import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] cursor-pointer select-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white shadow-soft hover:bg-brand-dark hover:shadow-lift',
        secondary:
          'bg-white text-ink border border-line shadow-soft hover:bg-neutral-50 hover:border-neutral-300',
        ghost: 'text-ink hover:bg-neutral-100',
        ai: 'bg-ai text-white shadow-soft hover:bg-indigo-700 hover:shadow-lift',
        'ai-soft': 'bg-ai-soft text-ai hover:bg-indigo-100',
        soft: 'bg-brand-soft text-brand-dark hover:bg-red-100',
        dark: 'bg-ink text-white hover:bg-neutral-800',
        link: 'text-brand underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-9 px-3 text-[13px]',
        md: 'h-11 px-4',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'h-11 w-11',
        'icon-sm': 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = 'Button';
