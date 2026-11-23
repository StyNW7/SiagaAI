import { create } from 'zustand';
import type { Bi } from '@/lib/i18n';

/**
 * Remembers where a visitor left the "Tentang / About" story page before jumping into a
 * live feature, so one click brings them back to the exact same spot (and feature tab).
 * Kept in sessionStorage: survives reloads within the tab, never leaks across visits.
 */
export interface StoryReturn {
  /** Path to come back to. */
  path: string;
  /** Short label for the return pill, e.g. the feature name. */
  label: Bi;
  /** Feature tab that was open when the visitor left. */
  feature?: string;
  /** Exact scroll position to restore. */
  scrollY: number;
  at: number;
}

/** The storytelling page. `/tentang` is an alias that renders the same page. */
export const STORY_PATH = '/about';
export const STORY_PATHS = [STORY_PATH, '/tentang'];

const KEY = 'siaga.storyReturn';
const MAX_AGE = 1000 * 60 * 60 * 6; // stale after six hours

function read(): StoryReturn | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as StoryReturn;
    if (typeof r?.path !== 'string' || typeof r.scrollY !== 'number' || Date.now() - (r.at ?? 0) > MAX_AGE)
      return null;
    return r;
  } catch {
    return null;
  }
}

function write(r: StoryReturn | null) {
  try {
    if (r) sessionStorage.setItem(KEY, JSON.stringify(r));
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage unavailable — the in-memory value still works for this visit
  }
}

interface StoryState {
  ret: StoryReturn | null;
  save: (r: Omit<StoryReturn, 'at'>) => void;
  clear: () => void;
}

export const useStoryReturn = create<StoryState>((set) => ({
  ret: read(),
  save: (r) => {
    const next = { ...r, at: Date.now() };
    write(next);
    set({ ret: next });
  },
  clear: () => {
    write(null);
    set({ ret: null });
  },
}));
