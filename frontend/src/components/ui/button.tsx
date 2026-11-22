import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[14px] font-semibold tracking-[-0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.985] cursor-pointer select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(163_19_25/0.25)] hover:bg-brand-dark',
        secondary:
          'bg-surface text-ink border border-line-strong/80 shadow-soft hover:border-neutral-400 hover:bg-raised',
        ghost: 'text-ink hover:bg-neutral-100',
        ai: 'bg-ai text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] hover:bg-ai-deep',
        'ai-soft': 'bg-ai-soft text-ai-deep hover:bg-[#E2E5FF] dark:hover:bg-[#2a2c5c]',
        soft: 'bg-brand-soft text-brand-dark hover:bg-[#F8DCDD] dark:hover:bg-[#4d1c1f]',
        dark: 'bg-inverse text-on-inverse hover:bg-inverse-hover',
        critical: 'bg-risk-critical text-white hover:brightness-90',
        link: 'text-brand underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px] rounded-lg',
        md: 'h-11 px-4.5',
        lg: 'h-12 px-6 text-[15px] rounded-xl',
        icon: 'h-11 w-11',
        'icon-sm': 'h-9 w-9 rounded-lg',
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
