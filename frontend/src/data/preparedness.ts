/**
 * Curated preparedness action library, aligned with publicly available BNPB/BPBD,
 * BMKG and Kemenkes guidance (see docs/METHODOLOGY.md for references).
 * Used (1) as grounding context for the LLM and (2) by the offline local reasoner.
 */
import type { HazardType, RiskLevel } from '@/features/risk/engine/types';

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

export const ACTIONS: PrepAction[] = [
  // ── General ──────────────────────────────────────────────────────────────
  {
    id: 'g1',
    hazard: 'general',
    phase: 'now',
    minLevel: 'safe',
    text: 'Pantau pembaruan resmi BMKG & BPBD setempat secara berkala',
  },
  {
    id: 'g2',
    hazard: 'general',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Isi daya ponsel & power bank, simpan nomor darurat 112',
  },
  {
    id: 'g3',
    hazard: 'general',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Periksa kesiapan Tas Siaga Bencana (dokumen, obat, air, senter)',
  },
  {
    id: 'g4',
    hazard: 'general',
    phase: 'worsen',
    minLevel: 'safe',
    text: 'Ikuti arahan resmi BPBD/aparat; hubungi 112 bila dalam bahaya',
  },
  {
    id: 'g5',
    hazard: 'general',
    phase: 'hours',
    minLevel: 'low',
    text: 'Cek kembali SiagaAI dalam 3 jam untuk pembaruan kondisi',
  },
  {
    id: 'g6',
    hazard: 'general',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Sepakati titik kumpul & cara saling mengabari dengan keluarga',
    tags: ['family'],
  },

  // ── Smoke / karhutla ─────────────────────────────────────────────────────
  {
    id: 's1',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'low',
    text: 'Cek kualitas udara sebelum beraktivitas di luar ruangan',
  },
  {
    id: 's2',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Gunakan masker yang rapat (idealnya N95/KN95) saat di luar ruangan',
  },
  {
    id: 's3',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Tutup jendela & ventilasi saat asap terasa pekat',
  },
  {
    id: 's4',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Pakai masker & kacamata pelindung, kurangi kecepatan saat jarak pandang turun',
    tags: ['motorcycle'],
  },
  {
    id: 's5',
    hazard: 'smoke',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Jadwalkan perjalanan pada jam dengan kualitas udara lebih baik',
    tags: ['motorcycle', 'walking', 'student'],
  },
  {
    id: 's6',
    hazard: 'smoke',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Ambil jeda istirahat di dalam ruangan & perbanyak minum air',
    tags: ['outdoor', 'merchant'],
  },
  {
    id: 's7',
    hazard: 'smoke',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Batasi aktivitas luar anak & lansia; pilih ruangan tertutup',
    tags: ['family', 'child', 'elderly'],
  },
  {
    id: 's8',
    hazard: 'smoke',
    phase: 'hours',
    minLevel: 'high',
    text: 'Siapkan satu "ruang bersih" di rumah (tertutup, bila ada pakai air purifier)',
    tags: ['family'],
  },
  {
    id: 's9',
    hazard: 'smoke',
    phase: 'worsen',
    minLevel: 'moderate',
    text: 'Segera ke fasilitas kesehatan bila sesak napas, batuk berat, atau nyeri dada',
  },
  {
    id: 's10',
    hazard: 'smoke',
    phase: 'worsen',
    minLevel: 'high',
    text: 'Pertimbangkan menunda perjalanan & bekerja dari dalam ruangan',
    tags: ['student', 'office', 'outdoor'],
  },
  {
    id: 'f1',
    hazard: 'fire',
    phase: 'now',
    minLevel: 'low',
    text: 'Jangan membakar sampah atau lahan — dilarang dan memicu karhutla',
  },
  {
    id: 'f2',
    hazard: 'fire',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Laporkan kemunculan api/asap baru ke Damkar 113 atau BPBD',
  },
  {
    id: 'f3',
    hazard: 'fire',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Hindari jalur di dekat lahan gambut/semak kering yang terbakar',
  },
  {
    id: 'f4',
    hazard: 'fire',
    phase: 'worsen',
    minLevel: 'high',
    text: 'Bila api mendekat, evakuasi melawan arah angin & ikuti petugas',
  },

  // ── Flood ────────────────────────────────────────────────────────────────
  {
    id: 'b1',
    hazard: 'flood',
    phase: 'now',
    minLevel: 'low',
    text: 'Bersihkan saluran air & talang di sekitar rumah',
  },
  {
    id: 'b2',
    hazard: 'flood',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Pindahkan barang berharga & dokumen ke tempat yang lebih tinggi',
  },
  {
    id: 'b3',
    hazard: 'flood',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Cek rute perjalanan; hindari underpass & jalan rawan genangan',
    tags: ['motorcycle', 'car', 'public', 'student'],
  },
  {
    id: 'b4',
    hazard: 'flood',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Siapkan jas hujan & lindungi ponsel dalam kantong kedap air',
    tags: ['motorcycle', 'walking'],
  },
  {
    id: 'b5',
    hazard: 'flood',
    phase: 'hours',
    minLevel: 'high',
    text: 'Ketahui lokasi pengungsian & jalur evakuasi terdekat',
  },
  {
    id: 'b6',
    hazard: 'flood',
    phase: 'worsen',
    minLevel: 'moderate',
    text: 'Jangan menerobos genangan/arus: 15 cm air deras dapat menjatuhkan orang',
  },
  {
    id: 'b7',
    hazard: 'flood',
    phase: 'worsen',
    minLevel: 'moderate',
    text: 'Matikan listrik dari MCB bila air mulai masuk rumah',
  },
  {
    id: 'b8',
    hazard: 'flood',
    phase: 'worsen',
    minLevel: 'high',
    text: 'Evakuasi lebih awal bersama anak, lansia & penyandang disabilitas',
    tags: ['family', 'child', 'elderly'],
  },
  {
    id: 'b9',
    hazard: 'flood',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Amankan dagangan & peralatan usaha dari potensi genangan',
    tags: ['merchant'],
  },

  // ── Extreme weather ──────────────────────────────────────────────────────
  {
    id: 'w1',
    hazard: 'weather',
    phase: 'now',
    minLevel: 'low',
    text: 'Bawa payung/jas hujan untuk aktivitas hari ini',
  },
  {
    id: 'w2',
    hazard: 'weather',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Hindari berteduh di bawah pohon besar, baliho, atau tiang listrik',
  },
  {
    id: 'w3',
    hazard: 'weather',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Menepi di tempat aman saat hujan lebat & petir; jangan memaksakan berkendara',
    tags: ['motorcycle'],
  },
  {
    id: 'w4',
    hazard: 'weather',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Tunda pekerjaan di ketinggian/area terbuka saat ada petir',
    tags: ['outdoor'],
  },
  {
    id: 'w5',
    hazard: 'weather',
    phase: 'hours',
    minLevel: 'moderate',
    text: 'Ikat atau simpan benda ringan di luar rumah yang mudah terbang',
  },
  {
    id: 'w6',
    hazard: 'weather',
    phase: 'now',
    minLevel: 'moderate',
    text: 'Saat panas terik: minum cukup air & hindari terik 11.00–15.00',
    tags: ['outdoor', 'merchant', 'elderly'],
  },
  {
    id: 'w7',
    hazard: 'weather',
    phase: 'worsen',
    minLevel: 'moderate',
    text: 'Jauhi kabel listrik putus & pohon tumbang; laporkan ke PLN 123',
  },
];

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
    const tagged = a.tags?.some((t) => tags.includes(t)) ? 2.5 : a.tags ? -3 : 0;
    return lvl * 2 + tagged + LEVEL_RANK[a.minLevel] * 0.5;
  };
  return relevant.sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, limit);
}

export const GO_BAG = [
  {
    group: 'Dokumen',
    items: [
      'Fotokopi KTP, KK, BPJS & ijazah (dalam plastik kedap air)',
      'Daftar nomor penting keluarga',
      'Uang tunai secukupnya',
    ],
  },
  {
    group: 'Kesehatan',
    items: ['Obat-obatan pribadi & P3K', 'Masker N95/KN95', 'Hand sanitizer & tisu basah'],
  },
  {
    group: 'Logistik',
    items: ['Air minum ±3 liter per orang', 'Makanan siap saji untuk 3 hari', 'Senter, baterai & peluit'],
  },
  { group: 'Komunikasi', items: ['Power bank terisi penuh', 'Radio kecil (opsional)', 'Charger & kabel'] },
  { group: 'Pakaian', items: ['Pakaian ganti 3 hari', 'Jas hujan & selimut tipis', 'Alas kaki tertutup'] },
];

export const EMERGENCY_CONTACTS = [
  { number: '112', label: 'Panggilan Darurat Nasional', note: 'Gratis, 24 jam' },
  { number: '117', label: 'BNPB', note: 'Badan Nasional Penanggulangan Bencana' },
  { number: '113', label: 'Pemadam Kebakaran', note: 'Kebakaran & karhutla' },
  { number: '115', label: 'Basarnas', note: 'Pencarian & pertolongan' },
  { number: '119', label: 'Ambulans / PSC', note: 'Gawat darurat medis' },
  { number: '110', label: 'Polisi', note: 'Keamanan & lalu lintas' },
  { number: '123', label: 'PLN', note: 'Gangguan listrik' },
];
