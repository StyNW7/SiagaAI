import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const subscribeOnline = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

export const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

/** Animated count-up for metrics (respects reduced motion). */
export function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      from.current = target;
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(origin + (target - origin) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * True while the user is scrolling down (past `offset` px); false on scroll up, near the top,
 * or at the very bottom of the page. Used to tuck floating buttons away so they never sit on
 * top of the content being read.
 */
export function useHideOnScroll(offset = 120) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 8;
        if (y < offset || atBottom) setHidden(false);
        else if (Math.abs(y - last) > 6) setHidden(y > last);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [offset]);
  return hidden;
}

/** Re-render every `ms` so relative timestamps ("12 menit lalu") stay accurate. */
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · SiagaAI`;
  }, [title]);
}

/**
 * Boolean UI preference remembered in localStorage (e.g. collapsed map panels).
 * `fallback` is used until the user makes an explicit choice, so it can depend on viewport size.
 */
export function usePersistentToggle(key: string, fallback: boolean, initialOverride?: boolean) {
  const storageKey = `siagaai:ui:${key}`;
  const [value, setValue] = useState<boolean>(() => {
    if (initialOverride !== undefined) return initialOverride;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw === null ? fallback : raw === '1';
    } catch {
      return fallback;
    }
  });
  const set = (next: boolean | ((v: boolean) => boolean)) =>
    setValue((prev) => {
      const v = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(storageKey, v ? '1' : '0');
      } catch {
        /* storage unavailable (private mode) — keep in memory only */
      }
      return v;
    });
  return [value, set] as const;
}
