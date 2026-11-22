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
