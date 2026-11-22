import type { AgeGroup, DailyActivity, ExposureLevel, Occupation, Transport } from '@/types/domain';

export type HazardType = 'flood' | 'fire' | 'smoke' | 'weather';
export type RiskLevel = 'safe' | 'low' | 'moderate' | 'high' | 'critical';
export type Confidence = 'high' | 'medium' | 'low';

/**
 * Normalised, provider-agnostic inputs for the risk engine.
 * `null` on a group means "the data source is unavailable" — never "zero".
 */
export interface HazardSignals {
  weather: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    visibility: number | null;
    weatherCode: number | null;
    precip24h: number;
    precipMaxHourly: number;
    precipProbMax: number;
    thunderstormHours: number;
    gustMax: number;
    tempMax: number;
  } | null;
  airQuality: { pm25: number | null; usAqi: number | null } | null;
  hotspots: {
    nearestKm: number | null;
    count25: number;
    count50: number;
    count100: number;
    upwindCount150: number;
    latestHoursAgo: number | null;
    frpSum50: number;
  } | null;
  river: { ratio: number | null; forecastMax: number | null } | null;
  officialWarning: { active: boolean; count: number; titles: string[] } | null;
}

export interface RiskFactor {
  key: string;
  label: string;
  /** Human-readable raw value, e.g. "42 mm" or "Tidak tersedia". */
  displayValue: string;
  /** 0–100 normalised indicator, null when unavailable. */
  normalized: number | null;
  /** Nominal weight (documented methodology). */
  weight: number;
  /** Weight after redistributing unavailable factors. */
  effectiveWeight: number;
  /** Points contributed to the hazard score. */
  contribution: number;
  available: boolean;
  source: string;
}

export interface HazardScore {
  hazard: HazardType;
  score: number;
  level: RiskLevel;
  available: boolean;
  confidence: Confidence;
  /** Share of nominal weight backed by available data (0–1). */
  coverage: number;
  factors: RiskFactor[];
  /** Deterministic one-line explanation of the main driver. */
  headline: string;
  note?: string;
}

export interface PersonalContext {
  occupation: Occupation;
  transport: Transport;
  exposure: ExposureLevel;
  activity: DailyActivity;
  ageGroup?: AgeGroup;
}

export interface ModifierContribution {
  label: string;
  delta: number;
}

export interface ExposureModifier {
  value: number;
  contributions: ModifierContribution[];
}

export interface PersonalHazardScore {
  hazard: HazardType;
  hazardScore: number;
  score: number;
  level: RiskLevel;
  modifier: ExposureModifier;
}

export interface CompositeScore {
  score: number;
  level: RiskLevel;
  primaryHazard: HazardType;
  secondaryHazard: HazardType | null;
}

export interface RiskAssessment {
  computedAt: string;
  hazards: Record<HazardType, HazardScore>;
  location: CompositeScore;
  personal: CompositeScore & { hazards: Record<HazardType, PersonalHazardScore>; modifierAvg: number };
  signals: HazardSignals;
}

export interface OutdoorWindow {
  start: string;
  end: string;
  index: number;
  reason: string;
}

export interface HourlyOutdoorPoint {
  time: string;
  index: number;
  rain: number;
  heat: number;
  air: number;
  storm: number;
}
