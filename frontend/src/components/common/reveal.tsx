import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

/** Fades + lifts children into view once, when they enter the viewport. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.7,0.3,1)] motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className,
      )}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}

/** Floating "back to top" button that appears after scrolling. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 900);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t('Kembali ke atas', 'Back to top')}
      className={cn(
        'fixed bottom-[calc(1.5rem+var(--safe-bottom))] right-4 z-40 sm:right-6 grid size-11 place-items-center rounded-full border border-line bg-surface/90 text-ink shadow-lift backdrop-blur transition-all duration-300 hover:-translate-y-0.5',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
