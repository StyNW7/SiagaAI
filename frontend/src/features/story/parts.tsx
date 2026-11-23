import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Reveal } from '@/components/common/reveal';
import { cn } from '@/lib/utils';
import { locale, t } from '@/lib/i18n';
import { SOURCE_BY_ID } from './data';

/** Shared horizontal rhythm for every story section. */
export const CONTAINER = 'mx-auto w-full max-w-[1240px] px-5 sm:px-8';

/** Siaga "alarm" gradient for the problem chapters. */
export const ALARM = 'linear-gradient(100deg, #f08a24 0%, #e0452a 45%, #b3141b 100%)';

/** Smooth-scroll to a section id (respects the fixed nav via scroll-padding-top). */
export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Count-up number, formatted for the active locale (1.623 / 1,623 · 10,09 / 10.09). */
export function Num({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1600,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const run = () => {
      if (reduce) {
        setV(value);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setV(value * (1 - (1 - p) ** 3));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  return (
    <span ref={ref} className={cn('tabular', className)}>
      {prefix}
      {v.toLocaleString(locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Chapter marker: "01 — Fakta". */
export function Chapter({
  n,
  label,
  center,
  light,
  tone = 'brand',
}: {
  n: string;
  label: string;
  center?: boolean;
  light?: boolean;
  tone?: 'brand' | 'calm';
}) {
  return (
    <Reveal className={cn('flex items-center gap-3', center && 'justify-center')}>
      <span
        className={cn(
          'tabular font-mono text-[12px] font-semibold',
          tone === 'calm' ? 'text-risk-safe' : light ? 'text-red-300' : 'text-brand',
        )}
      >
        {n}
      </span>
      <span className={cn('h-px w-10', light ? 'bg-white/25' : 'bg-line-strong')} aria-hidden />
      <span
        className={cn(
          'font-mono text-[11.5px] font-medium uppercase tracking-[0.14em]',
          light ? 'text-white/60' : 'text-muted',
        )}
      >
        {label}
      </span>
    </Reveal>
  );
}

export function Heading({ children, className, center }: { children: ReactNode; className?: string; center?: boolean }) {
  return (
    <Reveal
      as="h2"
      className={cn(
        'text-balance mt-4 text-[32px] font-extrabold leading-[1.06] tracking-[-0.04em] sm:text-[44px] lg:text-[52px]',
        center && 'mx-auto text-center',
        className,
      )}
    >
      {children}
    </Reveal>
  );
}

export function Lead({ children, className, center }: { children: ReactNode; className?: string; center?: boolean }) {
  return (
    <Reveal
      as="p"
      delay={80}
      className={cn(
        'text-pretty mt-4 max-w-2xl text-[16px] leading-relaxed text-muted sm:text-[18px]',
        center && 'mx-auto text-center',
        className,
      )}
    >
      {children}
    </Reveal>
  );
}

/** Small citation chip linking to the source. */
export function SourceChip({ id, className, light }: { id: string; className?: string; light?: boolean }) {
  const s = SOURCE_BY_ID[id];
  if (!s) return null;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'group inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.04em] transition-colors',
        light
          ? 'border-white/15 text-white/65 hover:border-white/35 hover:text-white'
          : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
        className,
      )}
      aria-label={t(`Sumber: ${s.org}, ${s.year} (tab baru)`, `Source: ${s.org}, ${s.year} (new tab)`)}
    >
      <span className="truncate">
        {s.org} · {s.year}
      </span>
      <ArrowUpRight className="size-3 shrink-0 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
    </a>
  );
}
