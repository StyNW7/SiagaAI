import type { HazardType, RiskLevel } from '@/features/risk/engine/types';
import { t } from '@/lib/i18n';

export interface RiskLevelMeta {
  level: RiskLevel;
  label: string;
  short: string;
  range: [number, number];
  color: string;
  soft: string;
  text: string;
  description: string;
}

/** Categories are product heuristics (documented on /app/about). Higher = more caution needed. */
export const RISK_LEVELS: Record<RiskLevel, RiskLevelMeta> = {
  safe: {
    level: 'safe',
    get label() {
      return t('Aman', 'Safe');
    },
    get short() {
      return t('AMAN', 'SAFE');
    },
    range: [0, 20],
    color: '#208A61',
    soft: 'var(--risk-safe-soft)',
    text: 'var(--risk-safe-text)',
    get description() {
      return t('Tidak ada sinyal bahaya berarti. Tetap pantau informasi resmi.', 'No significant hazard signals. Keep monitoring official information.');
    },
  },
  low: {
    level: 'low',
    get label() {
      return t('Rendah', 'Low');
    },
    get short() {
      return t('RENDAH', 'LOW');
    },
    range: [21, 40],
    color: '#3478C6',
    soft: 'var(--risk-low-soft)',
    text: 'var(--risk-low-text)',
    get description() {
      return t('Ada sinyal ringan. Aktivitas normal dengan kewaspadaan dasar.', 'Minor signals present. Normal activity with basic caution.');
    },
  },
  moderate: {
    level: 'moderate',
    get label() {
      return t('Sedang', 'Moderate');
    },
    get short() {
      return t('SEDANG', 'MODERATE');
    },
    range: [41, 60],
    color: '#D99A22',
    soft: 'var(--risk-moderate-soft)',
    text: 'var(--risk-moderate-text)',
    get description() {
      return t('Perlu kewaspadaan. Siapkan rencana dan pantau perkembangan.', 'Caution needed. Prepare a plan and monitor developments.');
    },
  },
  high: {
    level: 'high',
    get label() {
      return t('Tinggi', 'High');
    },
    get short() {
      return t('TINGGI', 'HIGH');
    },
    range: [61, 80],
    color: '#E66B24',
    soft: 'var(--risk-high-soft)',
    text: 'var(--risk-high-text)',
    get description() {
      return t('Risiko tinggi. Sesuaikan aktivitas dan siapkan langkah perlindungan.', 'High risk. Adjust activities and prepare protective measures.');
    },
  },
  critical: {
    level: 'critical',
    get label() {
      return t('Kritis', 'Critical');
    },
    get short() {
      return t('KRITIS', 'CRITICAL');
    },
    range: [81, 100],
    color: '#A51E22',
    soft: 'var(--risk-critical-soft)',
    text: 'var(--risk-critical-text)',
    get description() {
      return t('Kondisi sangat berbahaya. Utamakan keselamatan & ikuti arahan resmi.', 'Very dangerous conditions. Put safety first & follow official instructions.');
    },
  },
};

export const RISK_ORDER: RiskLevel[] = ['safe', 'low', 'moderate', 'high', 'critical'];

export function levelFromScore(score: number): RiskLevel {
  if (score <= 20) return 'safe';
  if (score <= 40) return 'low';
  if (score <= 60) return 'moderate';
  if (score <= 80) return 'high';
  return 'critical';
}

export interface HazardMeta {
  type: HazardType;
  label: string;
  longLabel: string;
  emoji: string;
  description: string;
}

export const HAZARDS: Record<HazardType, HazardMeta> = {
  fire: {
    type: 'fire',
    get label() {
      return t('Karhutla', 'Wildfire');
    },
    get longLabel() {
      return t('Aktivitas Titik Panas (Karhutla)', 'Hotspot Activity (Wildfire)');
    },
    emoji: '🔥',
    get description() {
      return t('Deteksi termal satelit di sekitar lokasi, kekeringan & angin.', 'Satellite thermal detections near the location, dryness & wind.');
    },
  },
  smoke: {
    type: 'smoke',
    get label() {
      return t('Asap', 'Smoke');
    },
    get longLabel() {
      return t('Potensi Paparan Asap', 'Potential Smoke Exposure');
    },
    emoji: '💨',
    get description() {
      return t('PM2.5 model, titik panas searah angin, dan jarak pandang.', 'Modelled PM2.5, upwind hotspots, and visibility.');
    },
  },
  flood: {
    type: 'flood',
    get label() {
      return t('Banjir', 'Flood');
    },
    get longLabel() {
      return t('Potensi Banjir', 'Flood Potential');
    },
    emoji: '🌊',
    get description() {
      return t('Curah hujan 24 jam, intensitas, debit sungai & peringatan BMKG.', '24-hour rainfall, intensity, river discharge & BMKG warnings.');
    },
  },
  weather: {
    type: 'weather',
    get label() {
      return t('Cuaca Ekstrem', 'Extreme Weather');
    },
    get longLabel() {
      return t('Cuaca Ekstrem', 'Extreme Weather');
    },
    emoji: '⛈️',
    get description() {
      return t('Badai petir, angin kencang, peluang hujan & panas.', 'Thunderstorms, strong winds, rain probability & heat.');
    },
  },
};

export const HAZARD_ORDER: HazardType[] = ['flood', 'fire', 'smoke', 'weather'];
