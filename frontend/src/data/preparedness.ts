/**
 * Curated preparedness action library, aligned with publicly available BNPB/BPBD,
 * BMKG and Kemenkes guidance (see docs/METHODOLOGY.md for references).
 * Used (1) as grounding context for the LLM and (2) by the offline local reasoner.
 */
import type { HazardType, RiskLevel } from '@/features/risk/engine/types';
import { t } from '@/lib/i18n';

export type ActionPhase = 'now' | 'hours' | 'worsen';
export type ActionTag =
  | 'motorcycle'
  | 'walking'
  | 'car'
  | 'public'
  | 'outdoor'
  | 'student'
  | 'merchant'
  | 'office'
  | 'family'
  | 'child'
  | 'elderly';

export interface PrepAction {
  id: string;
  hazard: HazardType | 'general';
  phase: ActionPhase;
  minLevel: RiskLevel;
  text: string;
  tags?: ActionTag[];
}

const RAW: (Omit<PrepAction, 'text'> & { id_text: string; en: string })[] = [
  // ── General ──────────────────────────────────────────────────────────────
  {
    id: 'g1',
    hazard: 'general',
    phase: 'now',
    minLevel: 'safe',
    id_text: 'Pantau pembaruan resmi BMKG & BPBD setempat secara berkala',
    en: 'Check official BMKG & local BPBD updates regularly',
  },
  {
    id: 'g2',
    hazard: 'general',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Isi daya ponsel & power bank, simpan nomor darurat 112',
    en: 'Charge your phone & power bank, save emergency number 112',
  },
  {
    id: 'g3',
    hazard: 'general',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Periksa kesiapan Tas Siaga Bencana (dokumen, obat, air, senter)',
    en: 'Check your Disaster Go-Bag is ready (documents, medicine, water, flashlight)',
  },
  {
    id: 'g4',
    hazard: 'general',
    phase: 'worsen',
    minLevel: 'safe',
    id_text: 'Ikuti arahan resmi BPBD/aparat; hubungi 112 bila dalam bahaya',
    en: 'Follow official BPBD/authority instructions; call 112 if in danger',
  },
  {
    id: 'g5',
    hazard: 'general',
    phase: 'hours',
    minLevel: 'low',
    id_text: 'Cek kembali SiagaAI dalam 3 jam untuk pembaruan kondisi',
    en: 'Check SiagaAI again within 3 hours for updated conditions',
  },
  {
    id: 'g6',
    hazard: 'general',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Sepakati titik kumpul & cara saling mengabari dengan keluarga',
    en: 'Agree on a meeting point & how to keep in touch with your family',
    tags: ['family'],
  },

  // ── Smoke / karhutla ─────────────────────────────────────────────────────
  {
    id: 's1',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'low',
    id_text: 'Cek kualitas udara sebelum beraktivitas di luar ruangan',
    en: 'Check air quality before doing outdoor activities',
  },
  {
    id: 's2',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Gunakan masker yang rapat (idealnya N95/KN95) saat di luar ruangan',
    en: 'Wear a well-fitting mask (ideally N95/KN95) when outdoors',
  },
  {
    id: 's3',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Tutup jendela & ventilasi saat asap terasa pekat',
    en: 'Close windows & vents when smoke feels thick',
  },
  {
    id: 's4',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Pakai masker & kacamata pelindung, kurangi kecepatan saat jarak pandang turun',
    en: 'Wear a mask & protective goggles, slow down when visibility drops',
    tags: ['motorcycle'],
  },
  {
    id: 's5',
    hazard: 'smoke',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Jadwalkan perjalanan pada jam dengan kualitas udara lebih baik',
    en: 'Schedule trips during hours with better air quality',
    tags: ['motorcycle', 'walking', 'student'],
  },
  {
    id: 's6',
    hazard: 'smoke',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Ambil jeda istirahat di dalam ruangan & perbanyak minum air',
    en: 'Take indoor rest breaks & drink plenty of water',
    tags: ['outdoor', 'merchant'],
  },
  {
    id: 's7',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Batasi aktivitas luar anak & lansia; pilih ruangan tertutup',
    en: 'Limit outdoor activity for children & older adults; stay in closed rooms',
    tags: ['family', 'child', 'elderly'],
  },
  {
    id: 's8',
    hazard: 'smoke',
    phase: 'hours',
    minLevel: 'high',
    id_text: 'Siapkan satu "ruang bersih" di rumah (tertutup, bila ada pakai air purifier)',
    en: 'Set up one "clean room" at home (closed, with an air purifier if available)',
    tags: ['family'],
  },
  {
    id: 's9',
    hazard: 'smoke',
    phase: 'worsen',
    minLevel: 'moderate',
    id_text: 'Segera ke fasilitas kesehatan bila sesak napas, batuk berat, atau nyeri dada',
    en: 'Go to a health facility right away if short of breath, coughing hard, or with chest pain',
  },
  {
    id: 's10',
    hazard: 'smoke',
    phase: 'worsen',
    minLevel: 'high',
    id_text: 'Pertimbangkan menunda perjalanan & bekerja dari dalam ruangan',
    en: 'Consider postponing trips & working indoors',
    tags: ['student', 'office', 'outdoor'],
  },
  {
    id: 'f1',
    hazard: 'fire',
    phase: 'now',
    minLevel: 'low',
    id_text: 'Jangan membakar sampah atau lahan — dilarang dan memicu karhutla',
    en: 'Do not burn rubbish or land — it is prohibited and triggers wildfires',
  },
  {
    id: 'f2',
    hazard: 'fire',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Laporkan kemunculan api/asap baru ke Damkar 113 atau BPBD',
    en: 'Report new fire/smoke to the Fire Department (113) or BPBD',
  },
  {
    id: 'f3',
    hazard: 'fire',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Hindari jalur di dekat lahan gambut/semak kering yang terbakar',
    en: 'Avoid routes near burning peatland/dry scrub',
  },
  {
    id: 'f4',
    hazard: 'fire',
    phase: 'worsen',
    minLevel: 'high',
    id_text: 'Bila api mendekat, evakuasi melawan arah angin & ikuti petugas',
    en: 'If fire approaches, evacuate against the wind & follow officers',
  },

  // ── Flood ────────────────────────────────────────────────────────────────
  {
    id: 'b1',
    hazard: 'flood',
    phase: 'now',
    minLevel: 'low',
    id_text: 'Bersihkan saluran air & talang di sekitar rumah',
    en: 'Clear drains & gutters around your home',
  },
  {
    id: 'b2',
    hazard: 'flood',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Pindahkan barang berharga & dokumen ke tempat yang lebih tinggi',
    en: 'Move valuables & documents to a higher place',
  },
  {
    id: 'b3',
    hazard: 'flood',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Cek rute perjalanan; hindari underpass & jalan rawan genangan',
    en: 'Check your route; avoid underpasses & flood-prone roads',
    tags: ['motorcycle', 'car', 'public', 'student'],
  },
  {
    id: 'b4',
    hazard: 'flood',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Siapkan jas hujan & lindungi ponsel dalam kantong kedap air',
    en: 'Prepare a raincoat & protect your phone in a waterproof pouch',
    tags: ['motorcycle', 'walking'],
  },
  {
    id: 'b5',
    hazard: 'flood',
    phase: 'hours',
    minLevel: 'high',
    id_text: 'Ketahui lokasi pengungsian & jalur evakuasi terdekat',
    en: 'Know the nearest evacuation shelter & route',
  },
  {
    id: 'b6',
    hazard: 'flood',
    phase: 'worsen',
    minLevel: 'moderate',
    id_text: 'Jangan menerobos genangan/arus: 15 cm air deras dapat menjatuhkan orang',
    en: 'Never cross floodwater/currents: 15 cm of fast water can knock a person down',
  },
  {
    id: 'b7',
    hazard: 'flood',
    phase: 'worsen',
    minLevel: 'moderate',
    id_text: 'Matikan listrik dari MCB bila air mulai masuk rumah',
    en: 'Switch off power at the breaker (MCB) if water starts entering the house',
  },
  {
    id: 'b8',
    hazard: 'flood',
    phase: 'worsen',
    minLevel: 'high',
    id_text: 'Evakuasi lebih awal bersama anak, lansia & penyandang disabilitas',
    en: 'Evacuate early with children, older adults & people with disabilities',
    tags: ['family', 'child', 'elderly'],
  },
  {
    id: 'b9',
    hazard: 'flood',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Amankan dagangan & peralatan usaha dari potensi genangan',
    en: 'Secure your goods & business equipment from possible flooding',
    tags: ['merchant'],
  },

  // ── Extreme weather ──────────────────────────────────────────────────────
  {
    id: 'w1',
    hazard: 'weather',
    phase: 'now',
    minLevel: 'low',
    id_text: 'Bawa payung/jas hujan untuk aktivitas hari ini',
    en: 'Bring an umbrella/raincoat for today\'s activities',
  },
  {
    id: 'w2',
    hazard: 'weather',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Hindari berteduh di bawah pohon besar, baliho, atau tiang listrik',
    en: 'Avoid sheltering under large trees, billboards, or power poles',
  },
  {
    id: 'w3',
    hazard: 'weather',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Menepi di tempat aman saat hujan lebat & petir; jangan memaksakan berkendara',
    en: 'Pull over somewhere safe during heavy rain & lightning; do not force riding',
    tags: ['motorcycle'],
  },
  {
    id: 'w4',
    hazard: 'weather',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Tunda pekerjaan di ketinggian/area terbuka saat ada petir',
    en: 'Postpone work at heights/open areas when there is lightning',
    tags: ['outdoor'],
  },
  {
    id: 'w5',
    hazard: 'weather',
    phase: 'hours',
    minLevel: 'moderate',
    id_text: 'Ikat atau simpan benda ringan di luar rumah yang mudah terbang',
    en: 'Tie down or store light outdoor items that can blow away',
  },
  {
    id: 'w6',
    hazard: 'weather',
    phase: 'now',
    minLevel: 'moderate',
    id_text: 'Saat panas terik: minum cukup air & hindari terik 11.00–15.00',
    en: 'In scorching heat: drink enough water & avoid the sun 11:00–15:00',
    tags: ['outdoor', 'merchant', 'elderly'],
  },
  {
    id: 'w7',
    hazard: 'weather',
    phase: 'worsen',
    minLevel: 'moderate',
    id_text: 'Jauhi kabel listrik putus & pohon tumbang; laporkan ke PLN 123',
    en: 'Stay away from downed power lines & fallen trees; report to PLN 123',
  },
];

/** Action library with `text` resolved in the active language on every access. */
export const ACTIONS: PrepAction[] = RAW.map(({ id_text, en, ...a }) => ({
  ...a,
  get text() {
    return t(id_text, en);
  },
}));

const LEVEL_RANK: Record<RiskLevel, number> = { safe: 0, low: 1, moderate: 2, high: 3, critical: 4 };

export function selectActions(
  hazardLevels: Record<HazardType, RiskLevel>,
  tags: ActionTag[],
  phase?: ActionPhase,
  limit = 6,
): PrepAction[] {
  const overall = Math.max(...Object.values(hazardLevels).map((l) => LEVEL_RANK[l]));
  const relevant = ACTIONS.filter((a) => {
    if (phase && a.phase !== phase) return false;
    const lvl = a.hazard === 'general' ? overall : LEVEL_RANK[hazardLevels[a.hazard]];
    return lvl >= LEVEL_RANK[a.minLevel];
  });
  const scoreOf = (a: PrepAction) => {
    const lvl = a.hazard === 'general' ? overall - 1 : LEVEL_RANK[hazardLevels[a.hazard]];
    const tagged = a.tags?.some((tag) => tags.includes(tag)) ? 2.5 : a.tags ? -3 : 0;
    return lvl * 2 + tagged + LEVEL_RANK[a.minLevel] * 0.5;
  };
  return relevant.sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, limit);
}

const bag = (id: string, en: string, items: [string, string][]) => ({
  get group() {
    return t(id, en);
  },
  get items() {
    return items.map(([i, e]) => t(i, e));
  },
});

export const GO_BAG = [
  bag('Dokumen', 'Documents', [
    ['Fotokopi KTP, KK, BPJS & ijazah (dalam plastik kedap air)', 'Copies of ID card, family card, BPJS & diplomas (in a waterproof bag)'],
    ['Daftar nomor penting keluarga', 'List of important family phone numbers'],
    ['Uang tunai secukupnya', 'Some cash'],
  ]),
  bag('Kesehatan', 'Health', [
    ['Obat-obatan pribadi & P3K', 'Personal medicines & first-aid kit'],
    ['Masker N95/KN95', 'N95/KN95 masks'],
    ['Hand sanitizer & tisu basah', 'Hand sanitizer & wet wipes'],
  ]),
  bag('Logistik', 'Supplies', [
    ['Air minum ±3 liter per orang', 'Drinking water ±3 litres per person'],
    ['Makanan siap saji untuk 3 hari', 'Ready-to-eat food for 3 days'],
    ['Senter, baterai & peluit', 'Flashlight, batteries & whistle'],
  ]),
  bag('Komunikasi', 'Communication', [
    ['Power bank terisi penuh', 'Fully charged power bank'],
    ['Radio kecil (opsional)', 'Small radio (optional)'],
    ['Charger & kabel', 'Charger & cables'],
  ]),
  bag('Pakaian', 'Clothing', [
    ['Pakaian ganti 3 hari', 'Change of clothes for 3 days'],
    ['Jas hujan & selimut tipis', 'Raincoat & thin blanket'],
    ['Alas kaki tertutup', 'Closed-toe footwear'],
  ]),
];

const contact = (number: string, label: [string, string], note: [string, string]) => ({
  number,
  get label() {
    return t(...label);
  },
  get note() {
    return t(...note);
  },
});

export const EMERGENCY_CONTACTS = [
  contact('112', ['Panggilan Darurat Nasional', 'National Emergency Line'], ['Gratis, 24 jam', 'Free, 24 hours']),
  contact('117', ['BNPB', 'BNPB'], ['Badan Nasional Penanggulangan Bencana', 'National Disaster Management Agency']),
  contact('113', ['Pemadam Kebakaran', 'Fire Department'], ['Kebakaran & karhutla', 'Fires & wildfires']),
  contact('115', ['Basarnas', 'Basarnas'], ['Pencarian & pertolongan', 'Search & rescue']),
  contact('119', ['Ambulans / PSC', 'Ambulance / PSC'], ['Gawat darurat medis', 'Medical emergencies']),
  contact('110', ['Polisi', 'Police'], ['Keamanan & lalu lintas', 'Security & traffic']),
  contact('123', ['PLN', 'PLN'], ['Gangguan listrik', 'Power outages']),
];
