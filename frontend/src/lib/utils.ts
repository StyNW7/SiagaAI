import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/** Linear interpolation of `value` between [inMin, inMax] onto [0, 100], clamped. */
export function scale(value: number, inMin: number, inMax: number): number {
  if (inMax === inMin) return value >= inMax ? 100 : 0;
  return clamp(((value - inMin) / (inMax - inMin)) * 100);
}

/** Piecewise-linear mapping through sorted breakpoints `[[x, y], ...]`. */
export function piecewise(value: number, points: [number, number][]): number {
  if (value <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (value <= x1) return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

export const round = (value: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Small stable hash (FNV-1a) — used for AI response cache keys. */
export function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** Strips markup & control characters from user-generated text. */
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(CONTROL_CHARS, '')
    .trim()
    .slice(0, maxLength);
}
