import type { HazardType, RiskLevel } from '@/features/risk/engine/types';

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
    label: 'Aman',
    short: 'AMAN',
    range: [0, 20],
    color: '#208A61',
    soft: '#EEF7F2',
    text: '#17654A',
    description: 'Tidak ada sinyal bahaya berarti. Tetap pantau informasi resmi.',
  },
  low: {
    level: 'low',
    label: 'Rendah',
    short: 'RENDAH',
    range: [21, 40],
    color: '#3478C6',
    soft: '#EEF4FB',
    text: '#22579A',
    description: 'Ada sinyal ringan. Aktivitas normal dengan kewaspadaan dasar.',
  },
  moderate: {
    level: 'moderate',
    label: 'Sedang',
    short: 'SEDANG',
    range: [41, 60],
    color: '#D99A22',
    soft: '#FDF6E8',
    text: '#8A5A0B',
    description: 'Perlu kewaspadaan. Siapkan rencana dan pantau perkembangan.',
  },
  high: {
    level: 'high',
    label: 'Tinggi',
    short: 'TINGGI',
    range: [61, 80],
    color: '#E66B24',
    soft: '#FDF0E8',
    text: '#A4461A',
    description: 'Risiko tinggi. Sesuaikan aktivitas dan siapkan langkah perlindungan.',
  },
  critical: {
    level: 'critical',
    label: 'Kritis',
    short: 'KRITIS',
    range: [81, 100],
    color: '#A51E22',
    soft: '#FBEDED',
    text: '#7A1418',
    description: 'Kondisi sangat berbahaya. Utamakan keselamatan & ikuti arahan resmi.',
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
    label: 'Karhutla',
    longLabel: 'Aktivitas Titik Panas (Karhutla)',
    emoji: '🔥',
    description: 'Deteksi termal satelit di sekitar lokasi, kekeringan & angin.',
  },
  smoke: {
    type: 'smoke',
    label: 'Asap',
    longLabel: 'Potensi Paparan Asap',
    emoji: '💨',
    description: 'PM2.5 model, titik panas searah angin, dan jarak pandang.',
  },
  flood: {
    type: 'flood',
    label: 'Banjir',
    longLabel: 'Potensi Banjir',
    emoji: '🌊',
    description: 'Curah hujan 24 jam, intensitas, debit sungai & peringatan BMKG.',
  },
  weather: {
    type: 'weather',
    label: 'Cuaca Ekstrem',
    longLabel: 'Cuaca Ekstrem',
    emoji: '⛈️',
    description: 'Badai petir, angin kencang, peluang hujan & panas.',
  },
};

export const HAZARD_ORDER: HazardType[] = ['flood', 'fire', 'smoke', 'weather'];
