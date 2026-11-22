import { X } from 'lucide-react';
import {
  Accordion as AccordionPrimitive,
  Dialog as DialogPrimitive,
  Switch as SwitchPrimitive,
  Tabs as TabsPrimitive,
  Tooltip as TooltipPrimitive,
} from 'radix-ui';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ── Dialog ───────────────────────────────────────────────────────────── */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...p
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-neutral-950/35 backdrop-blur-[3px] data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[61] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 scrollbar-thin overflow-y-auto rounded-[18px] border border-line bg-white p-6 shadow-float focus:outline-none data-[state=open]:animate-fade-up sm:p-7',
          className,
        )}
        {...p}
      >
        <div className="mb-5 pr-8">
          <DialogPrimitive.Title className="text-[19px] font-bold tracking-[-0.02em] text-ink">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-sm text-muted">
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
        </div>
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-neutral-100 hover:text-ink"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ── Sheet (side / bottom drawer) ─────────────────────────────────────── */

export function SheetContent({
  side = 'right',
  className,
  children,
  title,
  hideTitle,
  ...p
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: 'right' | 'bottom' | 'left';
  title: string;
  hideTitle?: boolean;
}) {
  const pos =
    side === 'right'
      ? 'inset-y-0 right-0 h-full w-full sm:max-w-md border-l'
      : side === 'left'
        ? 'inset-y-0 left-0 h-full w-[85%] max-w-xs border-r'
        : 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[22px] border-t';
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-neutral-950/30 backdrop-blur-[3px] data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-[61] flex flex-col border-line bg-white shadow-float focus:outline-none',
          side === 'bottom' ? 'animate-sheet-up' : 'animate-sheet-right',
          pos,
          className,
        )}
        {...p}
      >
        <DialogPrimitive.Title
          className={hideTitle ? 'sr-only' : 'px-6 pt-6 text-[19px] font-bold tracking-[-0.02em]'}
        >
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────────── */

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...p }: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center gap-0.5 rounded-[11px] border border-line bg-neutral-100/80 p-[3px]',
        className,
      )}
      {...p}
    />
  );
}

export function TabsTrigger({ className, ...p }: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-muted transition-all hover:text-ink data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_3px_rgb(0_0_0/0.08)] [&_svg]:size-4 cursor-pointer',
        className,
      )}
      {...p}
    />
  );
}

/* ── Switch ───────────────────────────────────────────────────────────── */

export function Switch({ className, ...p }: ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-neutral-200 transition-colors data-[state=checked]:bg-brand',
        className,
      )}
      {...p}
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}

/* ── Tooltip ──────────────────────────────────────────────────────────── */

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tip({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[70] max-w-64 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium leading-snug text-white shadow-lift animate-fade-in"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ── Accordion ────────────────────────────────────────────────────────── */

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  value,
  title,
  children,
  className,
}: {
  value: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AccordionPrimitive.Item value={value} className={cn('border-b border-line last:border-b-0', className)}>
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-ink">
          {title}
          <svg
            className="size-4 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden pb-4 text-sm leading-relaxed text-neutral-600">
        {children}
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
