/**
 * SiagaAI i18n runtime — Bahasa Indonesia (default) & English.
 *
 * Strings are written inline as bilingual pairs so both versions always sit
 * side by side and keep the same meaning:  t('Rencana Aksi', 'Action Plan').
 *
 * The active language lives in the persisted settings store; the router tree
 * is re-keyed on change (see `main.tsx`), so plain `t()` calls — in components,
 * data modules and the deterministic risk engine alike — always resolve to the
 * current language without each caller having to subscribe.
 */
export type Lang = 'id' | 'en';

export const LANGS: { value: Lang; label: string; short: string; native: string }[] = [
  { value: 'id', label: 'Bahasa Indonesia', short: 'ID', native: 'Indonesian' },
  { value: 'en', label: 'English', short: 'EN', native: 'Bahasa Inggris' },
];

/** A bilingual string. */
export interface Bi {
  id: string;
  en: string;
}

let current: Lang = 'id';
const listeners = new Set<(l: Lang) => void>();

export const getLang = (): Lang => current;

export function setRuntimeLang(lang: Lang) {
  if (lang !== 'id' && lang !== 'en') return;
  if (lang === current) return;
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((fn) => fn(lang));
}

export const onLangChange = (fn: (l: Lang) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Picks the string for the active language. */
export const t = (id: string, en: string): string => (current === 'en' ? en : id);

/** Resolves a bilingual value (plain strings pass through unchanged). */
export const tx = (value: Bi | string | null | undefined): string =>
  value == null ? '' : typeof value === 'string' ? value : value[current];

/** BCP-47 locale for Intl formatters. */
export const locale = () => (current === 'en' ? 'en-GB' : 'id-ID');

export const isEn = () => current === 'en';

/** Indonesian phrases that appear inside data-source labels (provenance) → English. */
const SOURCE_PHRASES: [RegExp, string][] = [
  [/Peringatan Dini Cuaca/g, 'Weather Early Warning'],
  [/Informasi Gempabumi/g, 'Earthquake Information'],
  [/Prakiraan Cuaca Open Data/g, 'Open Data Weather Forecast'],
  [/\(resmi\)/g, '(official)'],
  [/\(detail per jam\)/g, '(hourly detail)'],
  [/model, bukan sensor/g, 'model, not sensors'],
  [/SIMULASI/g, 'SIMULATION'],
  [/Peringatan/g, 'Warnings'],
];

/** Localises a provenance/source label for display (source names themselves stay as-is). */
export function localizeSource(source: string): string {
  if (current !== 'en') return source;
  return SOURCE_PHRASES.reduce((s, [re, en]) => s.replace(re, en), source);
}
