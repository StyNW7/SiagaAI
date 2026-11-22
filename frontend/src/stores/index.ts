/**
 * Client state (Zustand). Persisted to localStorage so SiagaAI works fully in
 * guest mode and offline. When signed in with Supabase, `SyncManager` mirrors
 * these stores to Postgres (RLS-protected).
 *
 * Privacy: precise GPS coordinates are NEVER persisted unless the user taps
 * "Simpan lokasi ini" — GPS-sourced locations live in memory only.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ScenarioId } from '@/data/scenarios';
import type { ActionPlanOutput, FamilyPlanOutput } from '@ai/contracts';
import type { HazardType, RiskLevel } from '@/features/risk/engine/types';
import type {
  CommunityReport,
  FamilyMember,
  PersonalProfile,
  SavedLocation,
  UserLocation,
} from '@/types/domain';
import { uid } from '@/lib/utils';
import { setRuntimeLang, type Lang } from '@/lib/i18n';

const storage = createJSONStorage(() => localStorage);

/* ── Settings ───────────────────────────────────────────────────────────── */

export type ThemePref = 'light' | 'dark' | 'system';

interface SettingsState {
  scenario: ScenarioId | null;
  lang: Lang;
  theme: ThemePref;
  setLang: (l: Lang) => void;
  setTheme: (t: ThemePref) => void;
  textScale: number;
  onboarded: boolean;
  notifications: boolean;
  setScenario: (s: ScenarioId | null) => void;
  setTextScale: (n: number) => void;
  setOnboarded: (v: boolean) => void;
  setNotifications: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      scenario: null,
      lang: 'id',
      theme: 'system',
      setLang: (lang) => {
        setRuntimeLang(lang);
        set({ lang });
      },
      setTheme: (theme) => set({ theme }),
      textScale: 1,
      onboarded: false,
      notifications: false,
      setScenario: (scenario) => set({ scenario }),
      setTextScale: (textScale) => set({ textScale }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: 'siaga.settings',
      storage,
      onRehydrateStorage: () => (state) => {
        if (state?.lang) setRuntimeLang(state.lang);
      },
    },
  ),
);

// localStorage hydration is synchronous — align the i18n runtime immediately.
setRuntimeLang(useSettings.getState().lang);

/* ── Location ───────────────────────────────────────────────────────────── */

interface LocationState {
  current: UserLocation | null;
  saved: SavedLocation[];
  setCurrent: (l: UserLocation) => void;
  saveLocation: (l: UserLocation, name?: string) => SavedLocation;
  removeSaved: (id: string) => void;
  setSaved: (list: SavedLocation[]) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      current: null,
      saved: [],
      setCurrent: (current) => set({ current }),
      saveLocation: (l, name) => {
        const item: SavedLocation = {
          id: uid(),
          name: name || l.name,
          region: l.region,
          provinceCode: l.provinceCode,
          lat: l.lat,
          lon: l.lon,
          createdAt: new Date().toISOString(),
        };
        set({ saved: [item, ...get().saved].slice(0, 12) });
        if (get().current?.id === l.id)
          set({ current: { ...l, id: item.id, source: 'saved', name: item.name } });
        return item;
      },
      removeSaved: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),
      setSaved: (saved) => set({ saved }),
    }),
    {
      name: 'siaga.location',
      storage,
      // GPS fixes stay in memory only (privacy by default).
      partialize: (s) => ({
        saved: s.saved,
        current: s.current && s.current.source !== 'gps' ? s.current : null,
      }),
    },
  ),
);

/* ── Profile ────────────────────────────────────────────────────────────── */

export const DEFAULT_PROFILE: PersonalProfile = {
  displayName: '',
  occupation: 'student',
  transport: 'motorcycle',
  exposure: 'moderate',
  activity: 'mixed',
};

interface ProfileState {
  profile: PersonalProfile;
  customized: boolean;
  update: (p: Partial<PersonalProfile>) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      customized: false,
      update: (p) => set({ profile: { ...get().profile, ...p }, customized: true }),
      reset: () => set({ profile: DEFAULT_PROFILE, customized: false }),
    }),
    { name: 'siaga.profile', storage },
  ),
);

/* ── Family ─────────────────────────────────────────────────────────────── */

interface FamilyState {
  members: FamilyMember[];
  lastPlan: { plan: FamilyPlanOutput; provider: string; createdAt: string } | null;
  add: (m: Omit<FamilyMember, 'id'>) => void;
  update: (id: string, m: Partial<FamilyMember>) => void;
  remove: (id: string) => void;
  setMembers: (m: FamilyMember[]) => void;
  setLastPlan: (p: FamilyState['lastPlan']) => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      members: [],
      lastPlan: null,
      add: (m) => set({ members: [...get().members, { ...m, id: uid() }].slice(0, 10) }),
      update: (id, m) => set({ members: get().members.map((x) => (x.id === id ? { ...x, ...m } : x)) }),
      remove: (id) => set({ members: get().members.filter((x) => x.id !== id) }),
      setMembers: (members) => set({ members }),
      setLastPlan: (lastPlan) => set({ lastPlan }),
    }),
    { name: 'siaga.family', storage },
  ),
);

/* ── Action plans ───────────────────────────────────────────────────────── */

export interface SavedPlan {
  id: string;
  createdAt: string;
  locationName: string;
  level: RiskLevel;
  score: number;
  primaryHazard: HazardType;
  plan: ActionPlanOutput;
  provider: string;
  checked: string[];
  scenario?: boolean;
}

interface PlanState {
  plans: SavedPlan[];
  save: (p: Omit<SavedPlan, 'id' | 'createdAt' | 'checked'>) => SavedPlan;
  toggle: (planId: string, item: string) => void;
  remove: (id: string) => void;
  setPlans: (p: SavedPlan[]) => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plans: [],
      save: (p) => {
        const item: SavedPlan = { ...p, id: uid(), createdAt: new Date().toISOString(), checked: [] };
        set({ plans: [item, ...get().plans].slice(0, 20) });
        return item;
      },
      toggle: (planId, key) =>
        set({
          plans: get().plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  checked: p.checked.includes(key) ? p.checked.filter((c) => c !== key) : [...p.checked, key],
                }
              : p,
          ),
        }),
      remove: (id) => set({ plans: get().plans.filter((p) => p.id !== id) }),
      setPlans: (plans) => set({ plans }),
    }),
    { name: 'siaga.plans', storage },
  ),
);

/* ── Risk history ───────────────────────────────────────────────────────── */

export interface RiskSnapshot {
  id: string;
  time: string;
  locationName: string;
  lat: number;
  lon: number;
  score: number;
  personalScore: number;
  level: RiskLevel;
  primaryHazard: HazardType;
  hazards: Record<HazardType, number>;
  scenario: boolean;
}

interface HistoryState {
  snapshots: RiskSnapshot[];
  record: (s: Omit<RiskSnapshot, 'id'>) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      snapshots: [],
      record: (s) => {
        const list = get().snapshots;
        // One snapshot per location per hour.
        const hour = s.time.slice(0, 13);
        const dup = list.find(
          (x) =>
            x.locationName === s.locationName && x.time.slice(0, 13) === hour && x.scenario === s.scenario,
        );
        const next = dup
          ? list.map((x) => (x === dup ? { ...s, id: dup.id } : x))
          : [{ ...s, id: uid() }, ...list];
        set({ snapshots: next.slice(0, 240) });
      },
      clear: () => set({ snapshots: [] }),
    }),
    {
      name: 'siaga.history',
      storage,
      // Store coarse coordinates only (~1 km) — enough for history, not for tracking.
      partialize: (s) => ({
        snapshots: s.snapshots.map((x) => ({
          ...x,
          lat: Math.round(x.lat * 100) / 100,
          lon: Math.round(x.lon * 100) / 100,
        })),
      }),
    },
  ),
);

/* ── Community ──────────────────────────────────────────────────────────── */

interface CommunityState {
  reports: CommunityReport[];
  confirmed: string[];
  add: (r: Omit<CommunityReport, 'id' | 'createdAt' | 'confirmations'>) => CommunityReport;
  confirm: (id: string) => void;
  remove: (id: string) => void;
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      reports: [],
      confirmed: [],
      add: (r) => {
        const item: CommunityReport = {
          ...r,
          id: uid(),
          createdAt: new Date().toISOString(),
          confirmations: 0,
          mine: true,
        };
        set({ reports: [item, ...get().reports].slice(0, 50) });
        return item;
      },
      confirm: (id) => {
        if (get().confirmed.includes(id)) return;
        set({
          confirmed: [...get().confirmed, id],
          reports: get().reports.map((r) => (r.id === id ? { ...r, confirmations: r.confirmations + 1 } : r)),
        });
      },
      remove: (id) => set({ reports: get().reports.filter((r) => r.id !== id) }),
    }),
    { name: 'siaga.community', storage },
  ),
);

/* ── Auth ───────────────────────────────────────────────────────────────── */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  backend: 'supabase' | 'local';
}

interface AuthState {
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist((set) => ({ user: null, setUser: (user) => set({ user }) }), { name: 'siaga.auth', storage }),
);

/* ── Assistant UI ───────────────────────────────────────────────────────── */

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  followUps?: string[];
  error?: boolean;
}

interface AssistantState {
  open: boolean;
  messages: AssistantMessage[];
  setOpen: (v: boolean) => void;
  push: (m: Omit<AssistantMessage, 'id'>) => void;
  clear: () => void;
  /** Opens the assistant and immediately asks a question (contextual entry points). */
  ask: (q: string) => void;
  pending: string | null;
  consumePending: () => string | null;
  /** Extra right offset (px) for the floating button when a side panel is open. */
  offsetRight: number;
  setOffsetRight: (px: number) => void;
}

export const useAssistantStore = create<AssistantState>()((set, get) => ({
  open: false,
  messages: [],
  pending: null,
  offsetRight: 0,
  setOffsetRight: (offsetRight) => set({ offsetRight }),
  setOpen: (open) => set({ open }),
  push: (m) => set({ messages: [...get().messages, { ...m, id: uid() }].slice(-30) }),
  clear: () => set({ messages: [] }),
  ask: (q) => set({ open: true, pending: q }),
  consumePending: () => {
    const p = get().pending;
    if (p != null) set({ pending: null });
    return p;
  },
}));
