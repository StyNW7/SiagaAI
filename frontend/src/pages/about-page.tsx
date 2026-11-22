import { BookOpenText, Cpu, ExternalLink, Lock, Scale, ShieldAlert, Sparkles, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { Disclaimer, PageHeader } from '@/components/common/layout-bits';
import { RiskScaleLegend } from '@/components/common/risk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives';
import { Accordion, AccordionItem } from '@/components/ui/overlays';
import { COMPOSITE_WEIGHTS } from '@/features/risk/engine/assess';
import { MODIFIER_BOUNDS } from '@/features/risk/engine/exposure';
import { FIRE_WEATHER_ONLY_CAP, MIN_COVERAGE, WEIGHTS } from '@/features/risk/engine/hazards';
import { HAZARDS } from '@/lib/risk-levels';
import { useDocumentTitle } from '@/hooks/use-misc';

const SOURCES = [
  {
    name: 'BMKG — Prakiraan Cuaca Open Data',
    use: 'Suhu, kelembapan, angin, kondisi cuaca resmi tingkat kelurahan (3 harian, per 3 jam)',
    url: 'https://data.bmkg.go.id/prakiraan-cuaca/',
    freq: '2× sehari',
  },
  {
    name: 'BMKG — Peringatan Dini Cuaca (Nowcast/CAP)',
    use: 'Peringatan hujan lebat, petir & angin kencang per provinsi',
    url: 'https://www.bmkg.go.id/alerts/nowcast/id',
    freq: 'Saat diterbitkan',
  },
  {
    name: 'BMKG — Informasi Gempabumi (TEWS)',
    use: 'Gempa terbaru & gempa M5+ terkini',
    url: 'https://data.bmkg.go.id/gempabumi/',
    freq: 'Real-time',
  },
  {
    name: 'NASA FIRMS — VIIRS NRT (NOAA-20, NOAA-21, S-NPP)',
    use: 'Titik panas / deteksi termal satelit, waktu, keyakinan, FRP',
    url: 'https://firms.modaps.eosdis.nasa.gov/',
    freq: '~3 jam setelah lintasan',
  },
  {
    name: 'Open-Meteo Forecast',
    use: 'Detail per jam: curah hujan, peluang hujan, hembusan angin, jarak pandang',
    url: 'https://open-meteo.com/',
    freq: 'Per jam',
  },
  {
    name: 'CAMS (Copernicus) via Open-Meteo',
    use: 'Model PM2.5, PM10 & US AQI — bukan sensor lapangan',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
    freq: 'Per jam',
  },
  {
    name: 'GloFAS v4 via Open-Meteo Flood API',
    use: 'Debit sungai harian & prakiraan 7 hari',
    url: 'https://open-meteo.com/en/docs/flood-api',
    freq: 'Harian',
  },
  {
    name: 'Batas provinsi (BAKOSURTANAL/Dukcapil)',
    use: '34 provinsi, disederhanakan — ans-4175/peta-indonesia-geojson (MIT)',
    url: 'https://github.com/ans-4175/peta-indonesia-geojson',
    freq: 'Statis',
  },
  {
    name: 'OpenFreeMap / CARTO · © OpenStreetMap',
    use: 'Peta dasar netral (Positron)',
    url: 'https://openfreemap.org/',
    freq: 'Statis',
  },
  {
    name: 'Nominatim (OSM) & Open-Meteo Geocoding',
    use: 'Pencarian lokasi & reverse geocoding',
    url: 'https://nominatim.org/',
    freq: 'On-demand',
  },
];

const FACTOR_LABELS: Record<string, string> = {
  proximity: 'Kedekatan & kepadatan titik panas',
  recency: 'Kebaruan deteksi',
  dryness: 'Kekeringan (RH & hujan)',
  wind: 'Kecepatan angin',
  airQuality: 'PM2.5',
  pm25: 'Konsentrasi PM2.5',
  upwind: 'Titik panas searah angin ≤150 km',
  visibility: 'Jarak pandang',
  rain24h: 'Akumulasi hujan 24 jam',
  intensity: 'Intensitas hujan puncak',
  river: 'Anomali debit sungai',
  warning: 'Peringatan dini BMKG',
  thunderstorm: 'Potensi badai petir',
  gust: 'Hembusan angin maksimum',
  rainProbability: 'Peluang hujan',
  heat: 'Suhu maksimum',
};

export default function AboutPage() {
  useDocumentTitle('Data & Metodologi');
  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <BookOpenText className="size-3.5" /> Transparansi
          </span>
        }
        title="Data & Metodologi"
        mascot="explain"
        description="Sumber data, cara skor dihitung, peran AI, privasi & batasan."
      />

      <div className="grid gap-px overflow-hidden rounded-[16px] border border-line bg-line shadow-soft lg:grid-cols-3">
        <Principle
          n="01"
          icon={<Cpu className="size-5" />}
          title="Algoritma menghitung"
          text="Semua skor berasal dari Siaga Risk Engine yang deterministik, teruji (unit test) & terdokumentasi."
        />
        <Principle
          n="02"
          icon={<Sparkles className="size-5" />}
          title="AI menjelaskan"
          text="LLM hanya menerima konteks terstruktur untuk menjelaskan & merekomendasikan — dilarang mengarang angka."
        />
        <Principle
          n="03"
          icon={<ShieldAlert className="size-5" />}
          title="Resmi diutamakan"
          text="SiagaAI pendukung keputusan, bukan otoritas. Peringatan BMKG/BNPB/BPBD selalu diprioritaskan."
        />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Sumber data</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line font-mono text-[10.5px] uppercase tracking-[0.08em] text-subtle">
                <th className="py-2 pr-4 font-semibold">Sumber</th>
                <th className="py-2 pr-4 font-semibold">Digunakan untuk</th>
                <th className="py-2 font-semibold">Pembaruan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SOURCES.map((s) => (
                <tr key={s.name}>
                  <td className="py-3 pr-4 font-semibold">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 hover:text-brand"
                    >
                      {s.name} <ExternalLink className="size-3" />
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-neutral-600">{s.use}</td>
                  <td className="whitespace-nowrap py-3 text-neutral-600">{s.freq}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-muted">
            Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika). Data NASA FIRMS digunakan sesuai
            kebijakan data terbuka NASA. Open-Meteo berlisensi CC BY 4.0.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="size-4" /> Metodologi Indicative Siaga Score
            </CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">
              Nilai di bawah dirender langsung dari kode engine — dokumentasi tidak dapat berbeda dari
              implementasi.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => (
              <div key={k} className="rounded-xl border border-line p-4">
                <p className="text-[14px] font-bold">{HAZARDS[k].longLabel}</p>
                <ul className="mt-3 space-y-2">
                  {Object.entries(WEIGHTS[k]).map(([f, w]) => (
                    <li key={f} className="text-[12.5px]">
                      <div className="flex justify-between gap-2">
                        <span>{FACTOR_LABELS[f] ?? f}</span>
                        <span className="tabular font-bold">{Math.round(w * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div className="h-full rounded-full bg-ink" style={{ width: `${w * 100 * 2}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <ol className="grid gap-3 text-[13.5px] leading-relaxed text-neutral-700 md:grid-cols-2">
            <Step n={1} title="Normalisasi">
              Setiap indikator dipetakan ke 0–100 dengan kurva titik-patah (mis. hujan 24 jam mengikuti kelas
              BMKG: 20 / 50 / 100 / 150 mm).
            </Step>
            <Step n={2} title="Redistribusi bobot">
              Bila sumber data tidak tersedia, bobotnya dialihkan proporsional — bukan dianggap nol. Bahaya
              tidak dinilai bila cakupan data &lt; {MIN_COVERAGE * 100}%.
            </Step>
            <Step n={3} title="Batas kewajaran">
              Tanpa deteksi termal dalam 100 km, skor karhutla dari cuaca kering saja dibatasi maksimal{' '}
              {FIRE_WEATHER_ONLY_CAP}.
            </Step>
            <Step n={4} title="Skor lokasi">
              Komposit = {COMPOSITE_WEIGHTS.primary * 100}% bahaya dominan +{' '}
              {COMPOSITE_WEIGHTS.secondary * 100}% bahaya kedua.
            </Step>
            <Step n={5} title="Personalisasi">
              Skor personal = skor bahaya × pengubah paparan ({MODIFIER_BOUNDS.min}–{MODIFIER_BOUNDS.max})
              dari pekerjaan, transportasi, paparan & aktivitas — spesifik per bahaya.
            </Step>
            <Step n={6} title="Kategori">
              <RiskScaleLegend className="mt-1" />
            </Step>
          </ol>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-ai" /> Peran AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13.5px] leading-relaxed text-neutral-700">
            <p>
              Arsitektur: <b>PWA → gateway serverless (/api/ai atau Supabase Edge Function) → LLM</b> (Google
              Gemini, cadangan Groq/OpenRouter). Kunci API hanya ada di server.
            </p>
            <p>
              AI menerima konteks JSON terstruktur (lokasi dibulatkan ±1 km, skor, indikator, profil tanpa
              identitas) dan wajib menjawab dalam skema JSON yang divalidasi. Jawaban tidak valid ditolak.
            </p>
            <p>
              Tanpa koneksi/kunci, SiagaAI memakai <b>Local Reasoner</b> — generator bahasa deterministik dari
              data & pustaka aksi yang sama, sehingga fitur tidak pernah rusak. Penyedia selalu ditampilkan di
              setiap respons.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-4" /> Privasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13.5px] leading-relaxed text-neutral-700">
            <p>
              GPS hanya dipakai setelah izin dan <b>tidak disimpan</b> kecuali Anda memilih "Simpan lokasi".
              Riwayat menyimpan koordinat yang dibulatkan ±1 km.
            </p>
            <p>
              Tidak ada data medis yang diminta. Profil keluarga hanya kelompok usia & paparan. Foto laporan
              dikompres dan metadata EXIF/GPS dihapus di perangkat.
            </p>
            <p>
              Fitur inti berjalan tanpa login. Akun (Supabase Auth + Row Level Security) hanya untuk
              sinkronisasi & laporan komunitas.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4" /> Kesegaran data, batasan & keselarasan SDGs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['fresh']}>
            <AccordionItem value="fresh" title="Status kesegaran data">
              <b>Terkini</b> (&lt; 1 jam), <b>Menua</b> (&lt; 6 jam), <b>Usang</b> (&gt; 6 jam),{' '}
              <b>Tidak tersedia</b>. Titik panas: terkini &lt; 6 jam, menua &lt; 24 jam. Snapshot & data
              offline selalu diberi label dan tidak pernah ditampilkan sebagai live. Mode skenario memakai
              data simulasi yang ditandai banner permanen.
            </AccordionItem>
            <AccordionItem value="limits" title="Batasan yang perlu diketahui">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Titik panas adalah deteksi termal satelit — bisa berasal dari kebakaran, pembakaran
                  terkendali, atau sumber panas industri; tidak selalu kebakaran hutan.
                </li>
                <li>PM2.5 berasal dari model atmosfer CAMS (resolusi ~40 km), bukan sensor lokal.</li>
                <li>
                  GloFAS berresolusi ~5 km; sungai kecil/kanal kota mungkin tidak terwakili. Potensi banjir
                  tidak memodelkan drainase atau rob.
                </li>
                <li>
                  Batas provinsi memakai 34 provinsi (pra-pemekaran Papua 2022); provinsi baru dipetakan ke
                  provinsi induk.
                </li>
                <li>
                  Bobot & ambang Siaga Score adalah heuristik produk yang terdokumentasi, belum dikalibrasi
                  terhadap data kejadian historis — direncanakan bersama mitra BPBD/akademisi.
                </li>
                <li>Gempa ditampilkan sebagai informasi; SiagaAI tidak memprediksi gempa.</li>
              </ul>
            </AccordionItem>
            <AccordionItem value="sdg" title="Keselarasan SDGs & Kerangka Sendai">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <b>SDG 13.1</b> — memperkuat ketahanan & kapasitas adaptasi terhadap bencana iklim
                  (karhutla, banjir, cuaca ekstrem).
                </li>
                <li>
                  <b>SDG 11.5</b> — mengurangi dampak bencana terhadap warga kota melalui tindakan dini yang
                  personal.
                </li>
                <li>
                  <b>SDG 3.9 & 3.d</b> — mengurangi paparan polusi udara/asap dan memperkuat peringatan dini
                  risiko kesehatan.
                </li>
                <li>
                  <b>SDG 15</b> — mendukung pemantauan titik panas & pelaporan dini kebakaran hutan dan lahan.
                </li>
                <li>
                  <b>Kerangka Sendai</b> — Prioritas 1 (memahami risiko) & Prioritas 4 (kesiapsiagaan untuk
                  respons efektif), sejalan dengan inisiatif PBB "Early Warnings for All".
                </li>
              </ul>
            </AccordionItem>
            <AccordionItem value="oss" title="Open source & pengungkapan AI">
              Dibangun dengan React, Vite, TypeScript, Tailwind CSS, Radix UI (pola shadcn/ui), Lucide,
              MapLibre GL JS, Recharts, TanStack Query, Zustand, React Hook Form, Zod, vite-plugin-pwa &
              Supabase. Pengembangan dibantu AI coding assistant (Claude Code) sebagaimana diungkapkan di
              README & proposal sesuai ketentuan IT RUSH 2026.
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="mt-5 rounded-card border border-line bg-white p-4">
        <Disclaimer />
      </div>
    </div>
  );
}

function Principle({ n, icon, title, text }: { n: string; icon: ReactNode; title: string; text: string }) {
  return (
    <div className="bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="text-brand [&_svg]:size-5">{icon}</span>
        <span className="font-mono text-[12px] text-line-strong">{n}</span>
      </div>
      <h3 className="mt-4 text-[16px] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 rounded-xl border border-line bg-raised p-4">
      <span className="font-mono text-[13px] font-semibold text-brand">{String(n).padStart(2, '0')}</span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}
