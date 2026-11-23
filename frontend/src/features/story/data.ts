import {
  ClipboardCheck,
  Gauge,
  Map as MapIcon,
  MessageCircle,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AraPose } from '@/components/common/ara';
import type { Bi } from '@/lib/i18n';

/* ─────────────────────────────────────────────────────────────────────────────
   Content for the "Tentang / About" story page.
   Bilingual values are stored as { id, en } and resolved with tx() at render time.
   ───────────────────────────────────────────────────────────────────────── */

export interface Source {
  id: string;
  org: string;
  year: string;
  title: Bi;
  url: string;
}

export const SOURCES: Source[] = [
  {
    id: 'bnpb-2025',
    org: 'BNPB',
    year: '2025',
    title: {
      id: 'Rekap kejadian bencana 1 Jan–31 Des 2025 (data sementara, gis.bnpb.go.id) — via GoodStats',
      en: 'Disaster events 1 Jan–31 Dec 2025 (provisional, gis.bnpb.go.id) — via GoodStats',
    },
    url: 'https://data.goodstats.id/statistic/lebih-dari-10-juta-orang-terdampak-bencana-pada-2025-mayoritas-akibat-banjir-QcMkN',
  },
  {
    id: 'bnpb-2025-type',
    org: 'BNPB',
    year: '2025',
    title: {
      id: 'Komposisi jenis bencana & 99% hidrometeorologi (data s.d. 17 Des 2025) — via Kompas TV',
      en: 'Disaster types & 99% hydrometeorological (data to 17 Dec 2025) — via Kompas TV',
    },
    url: 'https://www.kompas.tv/info-publik/639409/data-bencana-indonesia-2025-3-116-kejadian',
  },
  {
    id: 'mhews-2025',
    org: 'UNDRR & WMO',
    year: '2025',
    title: {
      id: 'Global Status of Multi-Hazard Early Warning Systems 2025',
      en: 'Global Status of Multi-Hazard Early Warning Systems 2025',
    },
    url: 'https://www.undrr.org/reports/global-status-MHEWS-2025',
  },
  {
    id: 'gca-2019',
    org: 'Global Commission on Adaptation · WMO',
    year: '2019',
    title: {
      id: 'Peringatan 24 jam sebelumnya dapat memangkas kerugian hingga 30%',
      en: '24 hours of warning can cut the ensuing damage by 30%',
    },
    url: 'https://wmo.int/news/media-centre/climate-adaptation-summit-invest-early-warnings-and-early-action',
  },
  {
    id: 'wrr-2025',
    org: 'WorldRiskReport',
    year: '2025',
    title: {
      id: 'WorldRiskIndex 2025 — Indonesia peringkat ke-3 (skor 39,80)',
      en: 'WorldRiskIndex 2025 — Indonesia ranked 3rd (score 39.80)',
    },
    url: 'https://www.welthungerhilfe.org/news/publications/detail/worldriskreport-2025',
  },
  {
    id: 'bnpb-ispa-2019',
    org: 'BNPB · Kemenkes',
    year: '2019',
    title: {
      id: '919.516 penderita ISPA akibat asap karhutla, Feb–Sep 2019 (6 provinsi)',
      en: '919,516 ARI cases from wildfire haze, Feb–Sep 2019 (6 provinces)',
    },
    url: 'https://mongabay.co.id/2019/10/05/kala-kabut-asap-karhutla-membuat-udara-menjadi-pengap/',
  },
  {
    id: 'klhk-2019',
    org: 'KLHK · Greenpeace',
    year: '2019',
    title: {
      id: '1,65 juta hektare hutan & lahan terbakar pada 2019',
      en: '1.65 million hectares of forest & land burned in 2019',
    },
    url: 'https://greenpeace.org/static/planet4-indonesia-stateless/2024/08/85f6bf72-bagai-api-dalam-sekam-data-karhutla-kronis-2023_bahasa-indonesia.pdf',
  },
  {
    id: 'apjii-2025',
    org: 'APJII',
    year: '2025',
    title: {
      id: 'Profil Internet Indonesia 2025 — 229,43 juta pengguna (80,66%)',
      en: 'Indonesia Internet Profile 2025 — 229.43 million users (80.66%)',
    },
    url: 'https://teknologi.bisnis.com/read/20250806/101/1899997/data-apjii-pengguna-internet-di-indonesia-tembus-22943-juta-orang-pada-2025',
  },
  {
    id: 'ew4all',
    org: 'United Nations · WMO',
    year: '2022',
    title: {
      id: 'Early Warnings for All — setiap orang terlindungi peringatan dini pada akhir 2027',
      en: 'Early Warnings for All — everyone protected by early warnings by end-2027',
    },
    url: 'https://wmo.int/site/knowledge-hub/programmes-and-initiatives/early-warnings-all-ew4all',
  },
];

export const SOURCE_BY_ID: Record<string, Source> = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

/** BNPB 2025 composition by type (data to 17 Dec 2025, total 3,116). */
export const BREAKDOWN: { key: string; label: Bi; value: number; color: string }[] = [
  { key: 'flood', label: { id: 'Banjir', en: 'Floods' }, value: 1584, color: 'var(--color-hz-flood)' },
  {
    key: 'weather',
    label: { id: 'Cuaca ekstrem', en: 'Extreme weather' },
    value: 673,
    color: 'var(--color-hz-weather)',
  },
  { key: 'fire', label: { id: 'Karhutla', en: 'Wildfires' }, value: 546, color: 'var(--color-hz-fire)' },
  { key: 'slide', label: { id: 'Tanah longsor', en: 'Landslides' }, value: 225, color: '#9a6b3f' },
  { key: 'other', label: { id: 'Lainnya', en: 'Other' }, value: 88, color: 'var(--color-line-strong)' },
];
export const BREAKDOWN_TOTAL = 3116;

/* ── Persona: one day of Ara in the haze season ─────────────────────────── */

export interface Moment {
  time: string;
  title: Bi;
  pain: Bi;
  missing: Bi;
  /** 0–100: how calm Ara feels (drives the curve). */
  calm: number;
  /** Feature that answers this moment. */
  feature: string;
}

export const MOMENTS: Moment[] = [
  {
    time: '06.00',
    title: { id: 'Langit menguning', en: 'The sky turns yellow' },
    pain: { id: '“Aman nggak keluar rumah hari ini?”', en: '“Is it safe to go out today?”' },
    missing: { id: 'Satu jawaban jelas', en: 'One clear answer' },
    calm: 72,
    feature: 'score',
  },
  {
    time: '06.30',
    title: { id: 'Cek 4 aplikasi & 3 grup WA', en: 'Checks 4 apps & 3 chat groups' },
    pain: { id: '“Infonya beda-beda semua.”', en: '“Everyone says something different.”' },
    missing: { id: 'Satu sumber terpercaya', en: 'One trusted source' },
    calm: 56,
    feature: 'map',
  },
  {
    time: '07.15',
    title: { id: 'Naik motor ke kampus', en: 'Rides to campus' },
    pain: { id: '“PM2.5 tinggi… artinya apa buatku?”', en: '“PM2.5 is high… what does it mean for me?”' },
    missing: { id: 'Risiko personal', en: 'Personal risk' },
    calm: 40,
    feature: 'personal',
  },
  {
    time: '13.00',
    title: { id: 'Peringatan BMKG masuk', en: 'A BMKG warning arrives' },
    pain: { id: '“Terus aku harus ngapain?”', en: '“So what do I do now?”' },
    missing: { id: 'Langkah konkret', en: 'Concrete steps' },
    calm: 26,
    feature: 'action',
  },
  {
    time: '17.00',
    title: { id: 'Nenek mulai sesak', en: 'Grandma struggles to breathe' },
    pain: { id: '“Nggak ada rencana untuk keluarga.”', en: '“There’s no plan for the family.”' },
    missing: { id: 'Prioritas yang rentan', en: 'Priority for the vulnerable' },
    calm: 12,
    feature: 'family',
  },
  {
    time: '21.00',
    title: { id: 'Besok kuliah pagi lagi', en: 'Early class again tomorrow' },
    pain: { id: '“Mulai menebak dari nol lagi.”', en: '“Back to guessing from zero.”' },
    missing: { id: 'Tempat bertanya', en: 'Someone to ask' },
    calm: 20,
    feature: 'ask',
  },
];

/* ── Solution: the features to demo ─────────────────────────────────────── */

export interface Feature {
  id: string;
  n: string;
  name: Bi;
  tag: Bi;
  icon: LucideIcon;
  color: string;
  pose: AraPose;
  to: string;
  /** Question pre-filled into the assistant when this feature opens. */
  ask?: Bi;
  desc: Bi;
  points: Bi[];
}

export const FEATURES: Feature[] = [
  {
    id: 'score',
    n: '01',
    name: { id: 'Siaga Score', en: 'Siaga Score' },
    tag: { id: 'Dashboard', en: 'Dashboard' },
    icon: Gauge,
    color: '#d71920',
    pose: 'tablet',
    to: '/app',
    desc: {
      id: 'Karhutla, asap, banjir & cuaca ekstrem — dirangkum jadi satu skor 0–100 untuk lokasimu.',
      en: 'Wildfire, smoke, flood & extreme weather — condensed into one 0–100 score for your location.',
    },
    points: [
      { id: 'Data resmi BMKG, NASA FIRMS, CAMS & GloFAS', en: 'Official BMKG, NASA FIRMS, CAMS & GloFAS data' },
      { id: 'Label kesegaran data di setiap angka', en: 'A freshness label on every number' },
      { id: 'Tanpa login, GPS tidak disimpan', en: 'No login, GPS never stored' },
    ],
  },
  {
    id: 'map',
    n: '02',
    name: { id: 'Siaga Map', en: 'Siaga Map' },
    tag: { id: 'Peta interaktif', en: 'Interactive map' },
    icon: MapIcon,
    color: '#e66b24',
    pose: 'map',
    to: '/app/map',
    desc: {
      id: 'Titik panas satelit, peringatan BMKG, gempa & laporan warga — dalam satu peta.',
      en: 'Satellite hotspots, BMKG warnings, earthquakes & community reports — on one map.',
    },
    points: [
      { id: 'Heatmap & cluster titik panas 7 hari', en: '7-day hotspot heatmap & clusters' },
      { id: 'Klik provinsi → tren & penjelasan AI', en: 'Click a province → trend & AI explanation' },
      { id: 'Titik panas tak pernah disebut “kebakaran”', en: 'Hotspots are never called “fires”' },
    ],
  },
  {
    id: 'personal',
    n: '03',
    name: { id: 'Apa artinya bagi saya?', en: 'What does it mean for me?' },
    tag: { id: 'Personal Impact', en: 'Personal Impact' },
    icon: UserRound,
    color: '#4e54d8',
    pose: 'explain',
    to: '/app/risk',
    desc: {
      id: 'Bahaya sama, dampak berbeda. Skor menyesuaikan pekerjaan, transportasi & waktu di luar.',
      en: 'Same hazard, different impact. The score adapts to occupation, transport & time outdoors.',
    },
    points: [
      { id: 'Pengubah paparan 0,8–1,3× per bahaya', en: '0.8–1.3× exposure modifier per hazard' },
      { id: 'Jam paling aman untuk bepergian', en: 'The safest hours to travel' },
      { id: 'Ganti motor → mobil, skor ikut berubah', en: 'Switch motorbike → car, the score changes' },
    ],
  },
  {
    id: 'action',
    n: '04',
    name: { id: 'Rencana Aksi', en: 'Action Plan' },
    tag: { id: 'Tiga fase', en: 'Three phases' },
    icon: ClipboardCheck,
    color: '#208a61',
    pose: 'checklist',
    to: '/app/action-plan',
    desc: {
      id: 'Sekarang · beberapa jam ke depan · jika memburuk — langkah yang bisa langsung dicentang.',
      en: 'Now · next few hours · if it worsens — steps you can tick off right away.',
    },
    points: [
      { id: 'Tas Siaga & nomor darurat', en: 'Go-bag & emergency numbers' },
      { id: 'Bisa dibagikan ke keluarga', en: 'Shareable with family' },
      { id: 'Tetap tersedia offline', en: 'Still available offline' },
    ],
  },
  {
    id: 'family',
    n: '05',
    name: { id: 'Keluarga Siaga', en: 'Family Siaga' },
    tag: { id: 'Anak & lansia', en: 'Kids & elderly' },
    icon: Users,
    color: '#d99a22',
    pose: 'family',
    to: '/app/family',
    desc: {
      id: 'Anak & lansia ditandai prioritas, lalu SiagaAI menyusun rencana untuk seluruh keluarga.',
      en: 'Kids & older adults get priority, then SiagaAI builds a plan for the whole family.',
    },
    points: [
      { id: 'Cukup kelompok usia — tanpa data medis', en: 'Age group only — no medical data' },
      { id: 'Siapa yang dilindungi lebih dulu', en: 'Who to protect first' },
      { id: 'Rencana keluarga dalam satu klik', en: 'A family plan in one click' },
    ],
  },
  {
    id: 'ask',
    n: '06',
    name: { id: 'Tanya Ara', en: 'Ask Ara' },
    tag: { id: 'Asisten AI', en: 'AI assistant' },
    icon: MessageCircle,
    color: '#6f63b5',
    pose: 'wave',
    to: '/app',
    ask: {
      id: 'Aman nggak naik motor ke kampus jam 7 besok pagi?',
      en: 'Is it safe to ride my motorbike to campus at 7 tomorrow morning?',
    },
    desc: {
      id: 'Asisten yang sudah tahu lokasi, skor, cuaca & profilmu — bukan chatbot generik.',
      en: 'An assistant that already knows your location, score, weather & profile — not a generic chatbot.',
    },
    points: [
      { id: 'Algoritma menghitung, AI menjelaskan', en: 'The algorithm calculates, AI explains' },
      { id: 'Tak mengarang angka — skema tervalidasi', en: 'Never invents numbers — validated schema' },
      { id: 'Cadangan lokal saat offline', en: 'Local fallback when offline' },
    ],
  },
];

export const FEATURE_BY_ID: Record<string, Feature> = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

/** Chapters for the right-edge rail and progress. */
export const CHAPTERS: { id: string; n: string; label: Bi }[] = [
  { id: 'fakta', n: '01', label: { id: 'Fakta', en: 'Facts' } },
  { id: 'masalah', n: '02', label: { id: 'Masalah', en: 'Problem' } },
  { id: 'riset', n: '03', label: { id: 'Riset', en: 'Research' } },
  { id: 'ara', n: '04', label: { id: 'Persona', en: 'Persona' } },
  { id: 'pertanyaan', n: '05', label: { id: 'Pertanyaan', en: 'Question' } },
  { id: 'siagaai', n: '06', label: { id: 'Jawaban', en: 'Answer' } },
  { id: 'fitur', n: '07', label: { id: 'Fitur', en: 'Features' } },
  { id: 'dampak', n: '08', label: { id: 'Dampak', en: 'Impact' } },
  { id: 'sdgs', n: '09', label: { id: 'SDGs', en: 'SDGs' } },
  { id: 'penutup', n: '10', label: { id: 'Penutup', en: 'Closing' } },
];
