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
  <div className={cn('flex items-start justify-between gap-3 p-5 pb-3', className)} {...p} />
);
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-[15px] font-semibold leading-tight text-ink', className)} {...p} />
);
export const CardDescription = ({ className, ...p }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mt-1 text-[13px] leading-relaxed text-muted', className)} {...p} />
);
export const CardContent = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pt-0', className)} {...p} />
);
export const CardFooter = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-2 border-t border-line px-5 py-3', className)} {...p} />
);

/* ── Badge ────────────────────────────────────────────────────────────── */

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-neutral-100 text-neutral-700',
        outline: 'border border-line bg-white text-neutral-700',
        brand: 'bg-brand-soft text-brand-dark',
        ai: 'bg-ai-soft text-ai',
        success: 'bg-green-50 text-green-700',
        warning: 'bg-amber-50 text-amber-800',
        danger: 'bg-red-50 text-red-700',
        info: 'bg-blue-50 text-blue-700',
        dark: 'bg-ink text-white',
      },
      size: { sm: 'px-2 py-0.5 text-[11px]', md: 'px-2.5 py-1 text-xs' },
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
  'w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-neutral-400 transition-colors hover:border-neutral-300 focus:border-ai focus:outline-none focus:ring-4 focus:ring-ai/10 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(field, 'h-11', className)} {...p} />,
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
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
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
      className={cn('h-2 w-full overflow-hidden rounded-full bg-neutral-100', className)}
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
    <kbd className="rounded-md border border-line bg-neutral-50 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted">
      {children}
    </kbd>
  );
}
