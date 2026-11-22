/**
 * Personal exposure modifiers.
 *
 * Personal Siaga Score = Hazard Score × Exposure Modifier (bounded).
 * Deltas are hazard-specific: e.g. riding a motorcycle raises exposure to
 * smoke, rain and flooded roads much more than it raises fire proximity risk.
 */
import type { AgeGroup, DailyActivity, ExposureLevel, Occupation, Transport } from '@/types/domain';
import { round } from '@/lib/utils';
import type { ExposureModifier, HazardType, ModifierContribution, PersonalContext } from './types';

type Deltas = Partial<Record<HazardType, number>>;

export const MODIFIER_BOUNDS = { min: 0.8, max: 1.3 } as const;

export const OCCUPATION_DELTAS: Record<Occupation, Deltas> = {
  student: { fire: 0.03, smoke: 0.04, flood: 0.04, weather: 0.04 },
  office: { fire: -0.03, smoke: -0.04, flood: -0.02, weather: -0.04 },
  outdoor: { fire: 0.08, smoke: 0.12, flood: 0.06, weather: 0.1 },
  merchant: { fire: 0.03, smoke: 0.06, flood: 0.05, weather: 0.05 },
  other: {},
};

export const TRANSPORT_DELTAS: Record<Transport, Deltas> = {
  walking: { fire: 0.02, smoke: 0.06, flood: 0.06, weather: 0.06 },
  motorcycle: { fire: 0.03, smoke: 0.08, flood: 0.08, weather: 0.08 },
  car: { fire: -0.02, smoke: -0.03, flood: 0.02, weather: -0.03 },
  public: { smoke: 0.03, flood: 0.04, weather: 0.03 },
};

export const EXPOSURE_DELTAS: Record<ExposureLevel, Deltas> = {
  high: { fire: 0.04, smoke: 0.08, flood: 0.04, weather: 0.06 },
  moderate: {},
  low: { fire: -0.03, smoke: -0.06, flood: -0.03, weather: -0.05 },
};

export const ACTIVITY_DELTAS: Record<DailyActivity, Deltas> = {
  outdoor: { fire: 0.03, smoke: 0.05, flood: 0.03, weather: 0.05 },
  mixed: {},
  indoor: { fire: -0.02, smoke: -0.05, flood: -0.02, weather: -0.04 },
};

/** Physiological sensitivity (no medical data collected — age group only). */
export const AGE_DELTAS: Record<AgeGroup, Deltas> = {
  infant: { fire: 0.05, smoke: 0.18, flood: 0.1, weather: 0.08 },
  child: { fire: 0.04, smoke: 0.12, flood: 0.08, weather: 0.06 },
  teen: { smoke: 0.03 },
  adult: {},
  elderly: { fire: 0.05, smoke: 0.15, flood: 0.1, weather: 0.1 },
};

const LABELS = {
  occupation: {
    student: 'Pelajar/mahasiswa',
    office: 'Pekerja kantor',
    outdoor: 'Pekerja luar ruang',
    merchant: 'Pedagang',
    other: 'Pekerjaan lain',
  },
  transport: {
    walking: 'Berjalan kaki',
    motorcycle: 'Sepeda motor',
    car: 'Mobil',
    public: 'Transportasi umum',
  },
  exposure: {
    high: 'Paparan luar ruang tinggi',
    moderate: 'Paparan luar ruang sedang',
    low: 'Paparan luar ruang rendah',
  },
  activity: {
    outdoor: 'Aktivitas dominan luar ruang',
    mixed: 'Aktivitas campuran',
    indoor: 'Aktivitas dominan dalam ruang',
  },
  age: { infant: 'Balita', child: 'Anak-anak', teen: 'Remaja', adult: 'Dewasa', elderly: 'Lansia' },
} as const;

export function computeModifier(hazard: HazardType, ctx: PersonalContext): ExposureModifier {
  const parts: [string, Deltas][] = [
    [LABELS.occupation[ctx.occupation], OCCUPATION_DELTAS[ctx.occupation]],
    [LABELS.transport[ctx.transport], TRANSPORT_DELTAS[ctx.transport]],
    [LABELS.exposure[ctx.exposure], EXPOSURE_DELTAS[ctx.exposure]],
    [LABELS.activity[ctx.activity], ACTIVITY_DELTAS[ctx.activity]],
  ];
  if (ctx.ageGroup) parts.push([LABELS.age[ctx.ageGroup], AGE_DELTAS[ctx.ageGroup]]);

  const contributions: ModifierContribution[] = parts
    .map(([label, deltas]) => ({ label, delta: deltas[hazard] ?? 0 }))
    .filter((c) => c.delta !== 0);

  const raw = 1 + contributions.reduce((s, c) => s + c.delta, 0);
  const value = round(Math.min(MODIFIER_BOUNDS.max, Math.max(MODIFIER_BOUNDS.min, raw)), 2);
  return { value, contributions };
}

export const PERSONA_LABELS = LABELS;
