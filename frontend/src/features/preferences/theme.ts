import { useEffect, useSyncExternalStore } from 'react';
import { useSettings, type ThemePref } from '@/stores';

export type ResolvedTheme = 'light' | 'dark';

const media = () =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function subscribeSystem(cb: () => void) {
  const m = media();
  m?.addEventListener('change', cb);
  return () => m?.removeEventListener('change', cb);
}
const systemSnapshot = () => (media()?.matches ? 'dark' : 'light');

export const resolveTheme = (pref: ThemePref, system: ResolvedTheme): ResolvedTheme =>
  pref === 'system' ? system : pref;

/** The theme actually on screen ('system' resolved against the OS preference). */
export function useResolvedTheme(): ResolvedTheme {
  const pref = useSettings((s) => s.theme);
  const system = useSyncExternalStore(subscribeSystem, systemSnapshot, () => 'light') as ResolvedTheme;
  return resolveTheme(pref, system);
}

const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#D71920', dark: '#0E0E0D' };

/** Applies theme + language to <html> (class, color-scheme, lang, theme-color). */
export function usePreferencesSync() {
  const theme = useResolvedTheme();
  const lang = useSettings((s) => s.lang);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    // Enable colour transitions only after the first paint to avoid a flash on load.
    const id = requestAnimationFrame(() => root.classList.add('theme-ready'));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
}
