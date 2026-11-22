import { cva, type VariantProps } from 'class-variance-authority';
import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

/* ── Card ─────────────────────────────────────────────────────────────── */

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...p }, ref) => (
  <div ref={ref} className={cn('rounded-card border border-line bg-surface shadow-soft', className)} {...p} />
));
Card.displayName = 'Card';

export const CardHeader = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pt-6', className)}
    {...p}
  />
);
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-[16px] font-bold leading-snug tracking-[-0.015em] text-ink', className)} {...p} />
);
export const CardDescription = ({ className, ...p }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mt-1 text-[13px] leading-relaxed text-muted', className)} {...p} />
);
export const CardContent = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 pb-5 pt-0 sm:px-6 sm:pb-6', className)} {...p} />
);
export const CardFooter = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center gap-2 border-t border-line bg-raised/60 px-5 py-3 sm:px-6', className)}
    {...p}
  />
);

/* ── Badge ────────────────────────────────────────────────────────────── */

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap tracking-[0.01em] [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-line',
        outline: 'border border-line bg-white text-neutral-700',
        brand: 'bg-brand-soft text-brand-dark ring-1 ring-inset ring-brand/15',
        ai: 'bg-ai-soft text-ai-deep ring-1 ring-inset ring-ai/15',
        success: 'bg-[#EEF7F2] text-[#17654A] ring-1 ring-inset ring-[#208A61]/20',
        warning: 'bg-[#FDF6E8] text-[#8A5A0B] ring-1 ring-inset ring-[#D99A22]/25',
        danger: 'bg-[#FBEDED] text-[#7A1418] ring-1 ring-inset ring-[#A51E22]/20',
        info: 'bg-[#EEF4FB] text-[#22579A] ring-1 ring-inset ring-[#3478C6]/20',
        dark: 'bg-ink text-white',
      },
      size: { sm: 'px-2 py-0.5 text-[11px]', md: 'px-2.5 py-1 text-[12px]' },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  },
);

export const Badge = ({
  className,
  variant,
  size,
  ...p
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) => (
  <span className={cn(badgeVariants({ variant, size }), className)} {...p} />
);

/* ── Form controls ────────────────────────────────────────────────────── */

const field =
  'w-full rounded-[10px] border border-[#D8D7D2] bg-white px-3.5 text-[15px] text-ink placeholder:text-neutral-400 transition-[border-color,box-shadow] hover:border-neutral-400 focus:border-brand/60 focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(field, 'h-12', className)} {...p} />,
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea ref={ref} className={cn(field, 'min-h-24 py-3 leading-relaxed', className)} {...p} />
  ),
);
Textarea.displayName = 'Textarea';

export const Label = ({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('mb-1.5 block text-[13px] font-semibold text-ink', className)} {...p} />
);

export const FieldError = ({ children }: { children?: string }) =>
  children ? (
    <p role="alert" className="mt-1.5 text-[12px] font-medium text-risk-critical">
      {children}
    </p>
  ) : null;

/* ── Misc ─────────────────────────────────────────────────────────────── */

export const Skeleton = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div aria-hidden className={cn('skeleton rounded-lg', className)} {...p} />
);

export const Separator = ({ className }: { className?: string }) => (
  <div role="separator" className={cn('h-px w-full bg-line', className)} />
);

export function Progress({
  value,
  color,
  className,
  label,
}: {
  value: number;
  color?: string;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-neutral-100', className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color ?? 'var(--color-ink)' }}
      />
    </div>
  );
}

export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border border-line bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">
      {children}
    </kbd>
  );
}
