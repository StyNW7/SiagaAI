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
import { formatNumber } from '@/lib/format';
import { localizeSource, t } from '@/lib/i18n';

const sources = () => [
  {
    name: 'BMKG — Prakiraan Cuaca Open Data',
    use: t(
      'Suhu, kelembapan, angin, kondisi cuaca resmi tingkat kelurahan (3 harian, per 3 jam)',
      'Official village-level temperature, humidity, wind and weather conditions (3 days, every 3 hours)',
    ),
    url: 'https://data.bmkg.go.id/prakiraan-cuaca/',
    freq: t('2× sehari', '2× daily'),
  },
  {
    name: 'BMKG — Peringatan Dini Cuaca (Nowcast/CAP)',
    use: t(
      'Peringatan hujan lebat, petir & angin kencang per provinsi',
      'Heavy rain, lightning & strong wind warnings per province',
    ),
    url: 'https://www.bmkg.go.id/alerts/nowcast/id',
    freq: t('Saat diterbitkan', 'When issued'),
  },
  {
    name: 'BMKG — Informasi Gempabumi (TEWS)',
    use: t('Gempa terbaru & gempa M5+ terkini', 'Latest earthquake & recent M5+ earthquakes'),
    url: 'https://data.bmkg.go.id/gempabumi/',
    freq: 'Real-time',
  },
  {
    name: 'NASA FIRMS — VIIRS NRT (NOAA-20, NOAA-21, S-NPP)',
    use: t(
      'Titik panas / deteksi termal satelit, waktu, keyakinan, FRP',
      'Hotspots / satellite thermal detections, time, confidence, FRP',
    ),
    url: 'https://firms.modaps.eosdis.nasa.gov/',
    freq: t('~3 jam setelah lintasan', '~3 h after overpass'),
  },
  {
    name: 'Open-Meteo Forecast',
    use: t(
      'Detail per jam: curah hujan, peluang hujan, hembusan angin, jarak pandang',
      'Hourly detail: rainfall, rain probability, wind gusts, visibility',
    ),
    url: 'https://open-meteo.com/',
    freq: t('Per jam', 'Hourly'),
  },
  {
    name: 'CAMS (Copernicus) via Open-Meteo',
    use: t('Model PM2.5, PM10 & US AQI — bukan sensor lapangan', 'PM2.5, PM10 & US AQI model — not ground sensors'),
    url: 'https://open-meteo.com/en/docs/air-quality-api',
    freq: t('Per jam', 'Hourly'),
  },
  {
    name: 'GloFAS v4 via Open-Meteo Flood API',
    use: t('Debit sungai harian & prakiraan 7 hari', 'Daily river discharge & 7-day forecast'),
    url: 'https://open-meteo.com/en/docs/flood-api',
    freq: t('Harian', 'Daily'),
  },
  {
    name: t('Batas provinsi (BAKOSURTANAL/Dukcapil)', 'Province boundaries (BAKOSURTANAL/Dukcapil)'),
    use: t(
      '34 provinsi, disederhanakan — ans-4175/peta-indonesia-geojson (MIT)',
      '34 provinces, simplified — ans-4175/peta-indonesia-geojson (MIT)',
    ),
    url: 'https://github.com/ans-4175/peta-indonesia-geojson',
    freq: t('Statis', 'Static'),
  },
  {
    name: 'OpenFreeMap / CARTO · © OpenStreetMap',
    use: t('Peta dasar netral (Positron & Dark)', 'Neutral basemap (Positron & Dark)'),
    url: 'https://openfreemap.org/',
    freq: t('Statis', 'Static'),
  },
  {
    name: 'Nominatim (OSM) & Open-Meteo Geocoding',
    use: t('Pencarian lokasi & reverse geocoding', 'Location search & reverse geocoding'),
    url: 'https://nominatim.org/',
    freq: 'On-demand',
  },
];

const factorLabels = (): Record<string, string> => ({
  proximity: t('Kedekatan & kepadatan titik panas', 'Hotspot proximity & density'),
  recency: t('Kebaruan deteksi', 'Detection recency'),
  dryness: t('Kekeringan (RH & hujan)', 'Dryness (RH & rain)'),
  wind: t('Kecepatan angin', 'Wind speed'),
  airQuality: 'PM2.5',
  pm25: t('Konsentrasi PM2.5', 'PM2.5 concentration'),
  upwind: t('Titik panas searah angin ≤150 km', 'Upwind hotspots ≤150 km'),
  visibility: t('Jarak pandang', 'Visibility'),
  rain24h: t('Akumulasi hujan 24 jam', '24-hour rainfall accumulation'),
  intensity: t('Intensitas hujan puncak', 'Peak rainfall intensity'),
  river: t('Anomali debit sungai', 'River discharge anomaly'),
  warning: t('Peringatan dini BMKG', 'BMKG early warning'),
  thunderstorm: t('Potensi badai petir', 'Thunderstorm potential'),
  gust: t('Hembusan angin maksimum', 'Maximum wind gust'),
  rainProbability: t('Peluang hujan', 'Rain probability'),
  heat: t('Suhu maksimum', 'Maximum temperature'),
});

export default function AboutPage() {
  useDocumentTitle(t('Data & Metodologi', 'Data & Methodology'));
  const FACTOR_LABELS = factorLabels();
  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <BookOpenText className="size-3.5" /> {t('Transparansi', 'Transparency')}
          </span>
        }
        title={t('Data & Metodologi', 'Data & Methodology')}
        mascot="explain"
        description={t(
          'Sumber data, cara skor dihitung, peran AI, privasi & batasan.',
          'Data sources, how scores are calculated, the role of AI, privacy & limitations.',
        )}
      />

      <div className="grid gap-px overflow-hidden rounded-[16px] border border-line bg-line shadow-soft lg:grid-cols-3">
        <Principle
          n="01"
          icon={<Cpu className="size-5" />}
          title={t('Algoritma menghitung', 'The algorithm calculates')}
          text={t(
            'Semua skor berasal dari Siaga Risk Engine yang deterministik, teruji (unit test) & terdokumentasi.',
            'All scores come from the deterministic, unit-tested & documented Siaga Risk Engine.',
          )}
        />
        <Principle
          n="02"
          icon={<Sparkles className="size-5" />}
          title={t('AI menjelaskan', 'AI explains')}
          text={t(
            'LLM hanya menerima konteks terstruktur untuk menjelaskan & merekomendasikan — dilarang mengarang angka.',
            'The LLM only receives structured context to explain & recommend — it is not allowed to invent numbers.',
          )}
        />
        <Principle
          n="03"
          icon={<ShieldAlert className="size-5" />}
          title={t('Resmi diutamakan', 'Official comes first')}
          text={t(
            'SiagaAI pendukung keputusan, bukan otoritas. Peringatan BMKG/BNPB/BPBD selalu diprioritaskan.',
            'SiagaAI supports decisions; it is not an authority. BMKG/BNPB/BPBD warnings always take priority.',
          )}
        />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>{t('Sumber data', 'Data sources')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line font-mono text-[10.5px] uppercase tracking-[0.08em] text-subtle">
                <th className="py-2 pr-4 font-semibold">{t('Sumber', 'Source')}</th>
                <th className="py-2 pr-4 font-semibold">{t('Digunakan untuk', 'Used for')}</th>
                <th className="py-2 font-semibold">{t('Pembaruan', 'Updates')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sources().map((s) => (
                <tr key={s.url}>
                  <td className="py-3 pr-4 font-semibold">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 hover:text-brand"
                    >
                      {localizeSource(s.name)} <ExternalLink className="size-3" />
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-neutral-600">{s.use}</td>
                  <td className="whitespace-nowrap py-3 text-neutral-600">{s.freq}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-muted">
            {t(
              'Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika). Data NASA FIRMS digunakan sesuai kebijakan data terbuka NASA. Open-Meteo berlisensi CC BY 4.0.',
              "Source: BMKG (Indonesia's Agency for Meteorology, Climatology and Geophysics). NASA FIRMS data is used under NASA's open data policy. Open-Meteo is licensed CC BY 4.0.",
            )}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="size-4" /> {t('Metodologi Indicative Siaga Score', 'Indicative Siaga Score methodology')}
            </CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">
              {t(
                'Nilai di bawah dirender langsung dari kode engine — dokumentasi tidak dapat berbeda dari implementasi.',
                'The values below are rendered directly from the engine code — the documentation cannot drift from the implementation.',
              )}
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
                        <div className="h-full rounded-full bg-inverse" style={{ width: `${w * 100 * 2}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <ol className="grid gap-3 text-[13.5px] leading-relaxed text-neutral-700 md:grid-cols-2">
            <Step n={1} title={t('Normalisasi', 'Normalisation')}>
              {t(
                'Setiap indikator dipetakan ke 0–100 dengan kurva titik-patah (mis. hujan 24 jam mengikuti kelas BMKG: 20 / 50 / 100 / 150 mm).',
                'Each indicator is mapped to 0–100 with a piecewise curve (e.g. 24-hour rain follows BMKG classes: 20 / 50 / 100 / 150 mm).',
              )}
            </Step>
            <Step n={2} title={t('Redistribusi bobot', 'Weight redistribution')}>
              {t(
                `Bila sumber data tidak tersedia, bobotnya dialihkan proporsional — bukan dianggap nol. Bahaya tidak dinilai bila cakupan data < ${MIN_COVERAGE * 100}%.`,
                `When a data source is unavailable, its weight is redistributed proportionally — never treated as zero. A hazard is not scored when data coverage is < ${MIN_COVERAGE * 100}%.`,
              )}
            </Step>
            <Step n={3} title={t('Batas kewajaran', 'Plausibility cap')}>
              {t(
                `Tanpa deteksi termal dalam 100 km, skor karhutla dari cuaca kering saja dibatasi maksimal ${FIRE_WEATHER_ONLY_CAP}.`,
                `Without thermal detections within 100 km, a wildfire score from dry weather alone is capped at ${FIRE_WEATHER_ONLY_CAP}.`,
              )}
            </Step>
            <Step n={4} title={t('Skor lokasi', 'Location score')}>
              {t(
                `Komposit = ${COMPOSITE_WEIGHTS.primary * 100}% bahaya dominan + ${COMPOSITE_WEIGHTS.secondary * 100}% bahaya kedua.`,
                `Composite = ${COMPOSITE_WEIGHTS.primary * 100}% dominant hazard + ${COMPOSITE_WEIGHTS.secondary * 100}% second hazard.`,
              )}
            </Step>
            <Step n={5} title={t('Personalisasi', 'Personalisation')}>
              {t(
                `Skor personal = skor bahaya × pengubah paparan (${formatNumber(MODIFIER_BOUNDS.min, 1)}–${formatNumber(MODIFIER_BOUNDS.max, 1)}) dari pekerjaan, transportasi, paparan & aktivitas — spesifik per bahaya.`,
                `Personal score = hazard score × exposure modifier (${formatNumber(MODIFIER_BOUNDS.min, 1)}–${formatNumber(MODIFIER_BOUNDS.max, 1)}) from occupation, transport, exposure & activity — specific to each hazard.`,
              )}
            </Step>
            <Step n={6} title={t('Kategori', 'Categories')}>
              <RiskScaleLegend className="mt-1" />
            </Step>
          </ol>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-ai" /> {t('Peran AI', 'The role of AI')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13.5px] leading-relaxed text-neutral-700">
            <p>
              {t('Arsitektur:', 'Architecture:')}{' '}
              <b>{t('PWA → gateway serverless (/api/ai atau Supabase Edge Function) → LLM', 'PWA → serverless gateway (/api/ai or Supabase Edge Function) → LLM')}</b>{' '}
              {t(
                '(Google Gemini, cadangan Groq/OpenRouter). Kunci API hanya ada di server.',
                '(Google Gemini, with Groq/OpenRouter as fallbacks). API keys live only on the server.',
              )}
            </p>
            <p>
              {t(
                'AI menerima konteks JSON terstruktur (lokasi dibulatkan ±1 km, skor, indikator, profil tanpa identitas) dan wajib menjawab dalam skema JSON yang divalidasi. Jawaban tidak valid ditolak.',
                'The AI receives structured JSON context (location rounded to ±1 km, scores, indicators, an anonymous profile) and must answer in a validated JSON schema. Invalid answers are rejected.',
              )}
            </p>
            <p>
              {t('Tanpa koneksi/kunci, SiagaAI memakai', 'Without a connection/key, SiagaAI uses the')} <b>Local Reasoner</b>{' '}
              {t(
                '— generator bahasa deterministik dari data & pustaka aksi yang sama, sehingga fitur tidak pernah rusak. Penyedia selalu ditampilkan di setiap respons.',
                '— a deterministic language generator built on the same data & action library, so features never break. The provider is always shown on every response.',
              )}
            </p>
            <p>
              {t(
                'Bahasa jawaban AI mengikuti pilihan bahasa Anda (Indonesia/Inggris) dengan makna yang sama.',
                'AI answers follow your chosen language (Indonesian/English) with the same meaning.',
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-4" /> {t('Privasi', 'Privacy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[13.5px] leading-relaxed text-neutral-700">
            <p>
              {t('GPS hanya dipakai setelah izin dan', 'GPS is only used after permission and is')}{' '}
              <b>{t('tidak disimpan', 'not stored')}</b>{' '}
              {t(
                'kecuali Anda memilih "Simpan lokasi". Riwayat menyimpan koordinat yang dibulatkan ±1 km.',
                'unless you choose "Save location". History stores coordinates rounded to ±1 km.',
              )}
            </p>
            <p>
              {t(
                'Tidak ada data medis yang diminta. Profil keluarga hanya kelompok usia & paparan. Foto laporan dikompres dan metadata EXIF/GPS dihapus di perangkat.',
                'No medical data is requested. Family profiles contain only age group & exposure. Report photos are compressed and EXIF/GPS metadata is removed on-device.',
              )}
            </p>
            <p>
              {t(
                'Fitur inti berjalan tanpa login. Akun (Supabase Auth + Row Level Security) hanya untuk sinkronisasi & laporan komunitas.',
                'Core features work without signing in. Accounts (Supabase Auth + Row Level Security) are only for sync & community reports.',
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4" />{' '}
            {t('Kesegaran data, batasan & keselarasan SDGs', 'Data freshness, limitations & SDG alignment')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['fresh']}>
            <AccordionItem value="fresh" title={t('Status kesegaran data', 'Data freshness status')}>
              <b>{t('Terkini', 'Fresh')}</b> (&lt; {t('1 jam', '1 h')}), <b>{t('Menua', 'Aging')}</b> (&lt;{' '}
              {t('6 jam', '6 h')}), <b>{t('Usang', 'Stale')}</b> (&gt; {t('6 jam', '6 h')}),{' '}
              <b>{t('Tidak tersedia', 'Unavailable')}</b>.{' '}
              {t(
                'Titik panas: terkini < 6 jam, menua < 24 jam. Snapshot & data offline selalu diberi label dan tidak pernah ditampilkan sebagai live. Mode skenario memakai data simulasi yang ditandai banner permanen.',
                'Hotspots: fresh < 6 h, aging < 24 h. Snapshots & offline data are always labelled and never shown as live. Scenario mode uses simulated data marked with a permanent banner.',
              )}
            </AccordionItem>
            <AccordionItem value="limits" title={t('Batasan yang perlu diketahui', 'Limitations to be aware of')}>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  {t(
                    'Titik panas adalah deteksi termal satelit — bisa berasal dari kebakaran, pembakaran terkendali, atau sumber panas industri; tidak selalu kebakaran hutan.',
                    'Hotspots are satellite thermal detections — they may come from fires, controlled burning, or industrial heat sources; they are not always forest fires.',
                  )}
                </li>
                <li>
                  {t(
                    'PM2.5 berasal dari model atmosfer CAMS (resolusi ~40 km), bukan sensor lokal.',
                    'PM2.5 comes from the CAMS atmospheric model (~40 km resolution), not local sensors.',
                  )}
                </li>
                <li>
                  {t(
                    'GloFAS berresolusi ~5 km; sungai kecil/kanal kota mungkin tidak terwakili. Potensi banjir tidak memodelkan drainase atau rob.',
                    'GloFAS has ~5 km resolution; small rivers/city canals may not be represented. Flood potential does not model drainage or tidal flooding.',
                  )}
                </li>
                <li>
                  {t(
                    'Batas provinsi memakai 34 provinsi (pra-pemekaran Papua 2022); provinsi baru dipetakan ke provinsi induk.',
                    'Province boundaries use 34 provinces (before the 2022 Papua split); new provinces are mapped to their parent province.',
                  )}
                </li>
                <li>
                  {t(
                    'Bobot & ambang Siaga Score adalah heuristik produk yang terdokumentasi, belum dikalibrasi terhadap data kejadian historis — direncanakan bersama mitra BPBD/akademisi.',
                    'Siaga Score weights & thresholds are documented product heuristics, not yet calibrated against historical event data — planned with BPBD/academic partners.',
                  )}
                </li>
                <li>
                  {t(
                    'Gempa ditampilkan sebagai informasi; SiagaAI tidak memprediksi gempa.',
                    'Earthquakes are shown as information; SiagaAI does not predict earthquakes.',
                  )}
                </li>
              </ul>
            </AccordionItem>
            <AccordionItem value="sdg" title={t('Keselarasan SDGs & Kerangka Sendai', 'SDG & Sendai Framework alignment')}>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <b>SDG 13.1</b> —{' '}
                  {t(
                    'memperkuat ketahanan & kapasitas adaptasi terhadap bencana iklim (karhutla, banjir, cuaca ekstrem).',
                    'strengthening resilience & adaptive capacity to climate disasters (wildfires, floods, extreme weather).',
                  )}
                </li>
                <li>
                  <b>SDG 11.5</b> —{' '}
                  {t(
                    'mengurangi dampak bencana terhadap warga kota melalui tindakan dini yang personal.',
                    'reducing disaster impacts on city residents through personal early action.',
                  )}
                </li>
                <li>
                  <b>SDG 3.9 & 3.d</b> —{' '}
                  {t(
                    'mengurangi paparan polusi udara/asap dan memperkuat peringatan dini risiko kesehatan.',
                    'reducing exposure to air pollution/smoke and strengthening early warning of health risks.',
                  )}
                </li>
                <li>
                  <b>SDG 15</b> —{' '}
                  {t(
                    'mendukung pemantauan titik panas & pelaporan dini kebakaran hutan dan lahan.',
                    'supporting hotspot monitoring & early reporting of forest and land fires.',
                  )}
                </li>
                <li>
                  <b>{t('Kerangka Sendai', 'Sendai Framework')}</b> —{' '}
                  {t(
                    'Prioritas 1 (memahami risiko) & Prioritas 4 (kesiapsiagaan untuk respons efektif), sejalan dengan inisiatif PBB "Early Warnings for All".',
                    'Priority 1 (understanding risk) & Priority 4 (preparedness for effective response), in line with the UN "Early Warnings for All" initiative.',
                  )}
                </li>
              </ul>
            </AccordionItem>
            <AccordionItem value="oss" title={t('Open source & pengungkapan AI', 'Open source & AI disclosure')}>
              {t(
                'Dibangun dengan React, Vite, TypeScript, Tailwind CSS, Radix UI (pola shadcn/ui), Lucide, MapLibre GL JS, Recharts, TanStack Query, Zustand, React Hook Form, Zod, vite-plugin-pwa & Supabase. Pengembangan dibantu AI coding assistant (Claude Code) sebagaimana diungkapkan di README & proposal sesuai ketentuan IT RUSH 2026.',
                'Built with React, Vite, TypeScript, Tailwind CSS, Radix UI (shadcn/ui patterns), Lucide, MapLibre GL JS, Recharts, TanStack Query, Zustand, React Hook Form, Zod, vite-plugin-pwa & Supabase. Development was assisted by an AI coding assistant (Claude Code), as disclosed in the README & proposal per IT RUSH 2026 rules.',
              )}
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="mt-5 rounded-card border border-line bg-surface p-4">
        <Disclaimer />
      </div>
    </div>
  );
}

function Principle({ n, icon, title, text }: { n: string; icon: ReactNode; title: string; text: string }) {
  return (
    <div className="bg-surface p-6">
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
