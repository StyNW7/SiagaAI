import {
  ArrowRight,
  Bell,
  BrainCircuit,
  ClipboardCheck,
  Cpu,
  Gauge,
  HeartHandshake,
  Layers,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  Megaphone,
  Radar,
  Satellite,
  ShieldCheck,
  Sparkles,
  UserRound,
  WifiOff,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  IndonesiaSilhouette,
  Logo,
  MerahPutih,
  NusantaraBackdrop,
  projectToSilhouette,
} from '@/components/common/brand';
import { FreshnessBadge } from '@/components/common/data-state';
import { Disclaimer } from '@/components/common/layout-bits';
import { Button } from '@/components/ui/button';
import { SILHOUETTE_VIEWBOX } from '@/data/silhouette';
import { SCENARIOS } from '@/data/scenarios';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useDocumentTitle } from '@/hooks/use-misc';
import { useEarthquakesQuery, useHotspotsQuery, useWarningsQuery } from '@/hooks/use-siaga-data';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useSettings } from '@/stores';

const STEPS = [
  {
    n: '01',
    title: 'Detect',
    id: 'Deteksi',
    q: 'Apa yang sedang terjadi?',
    text: 'Menggabungkan titik panas satelit NASA FIRMS, prakiraan & peringatan BMKG, kualitas udara dan debit sungai.',
    icon: Satellite,
  },
  {
    n: '02',
    title: 'Understand',
    id: 'Pahami',
    q: 'Apa arti data ini?',
    text: 'Siaga Risk Engine yang deterministik mengubah sinyal teknis menjadi skor risiko 0–100 yang transparan.',
    icon: Cpu,
  },
  {
    n: '03',
    title: 'Personalize',
    id: 'Personalisasi',
    q: 'Apa artinya bagi saya?',
    text: 'Skor disesuaikan dengan pekerjaan, transportasi, paparan luar ruang & anggota keluarga yang rentan.',
    icon: UserRound,
  },
  {
    n: '04',
    title: 'Act',
    id: 'Bertindak',
    q: 'Apa yang harus saya lakukan?',
    text: 'AI menyusun rencana aksi konkret: sekarang, beberapa jam ke depan, dan jika kondisi memburuk.',
    icon: ClipboardCheck,
  },
];

const FEATURES = [
  {
    icon: Gauge,
    title: 'Siaga Dashboard',
    text: 'Jawab dalam 5 detik: di mana saya, apa yang terjadi, seberapa berisiko, apa yang harus dilakukan.',
  },
  {
    icon: MapIcon,
    title: 'Siaga Map interaktif',
    text: 'MapLibre WebGL: heatmap & cluster titik panas, choropleth provinsi, peringatan BMKG, gempa, PM2.5.',
  },
  {
    icon: Sparkles,
    title: 'Personal Impact Forecast',
    text: '"Apa artinya bagi saya?" — dampak berbeda untuk mahasiswa bermotor, pekerja luar ruang, atau keluarga.',
  },
  {
    icon: ClipboardCheck,
    title: 'AI Action Plan',
    text: 'Rencana aksi yang bisa dicentang, dibagikan, dicetak — dan tetap tersedia saat offline.',
  },
  {
    icon: HeartHandshake,
    title: 'Family Siaga',
    text: 'Prioritas risiko untuk anak, balita & lansia, plus rencana aksi keluarga.',
  },
  {
    icon: BrainCircuit,
    title: 'Asisten kontekstual',
    text: 'Tanya "Aman naik motor ke kampus jam 8?" — AI sudah tahu lokasi, cuaca, skor & profil Anda.',
  },
  {
    icon: Megaphone,
    title: 'Community Signal',
    text: 'Laporan warga dengan foto & lokasi, selalu ditandai belum terverifikasi.',
  },
  {
    icon: Bell,
    title: 'Alert Center & PWA',
    text: 'Peringatan BMKG & gempa terpadu, notifikasi, instal ke layar utama, mode offline.',
  },
];

const PERSONAS = [
  {
    emoji: '🛵',
    name: 'Raka, 20',
    role: 'Mahasiswa, naik motor ke kampus',
    q: '"Apakah aman saya berangkat kampus pagi ini?"',
    a: 'SiagaAI menghitung paparan perjalanan bermotor dan menyarankan jendela waktu dengan hujan & asap paling rendah.',
  },
  {
    emoji: '👩‍👧‍👦',
    name: 'Sari, 38',
    role: 'Ibu dengan anak & orang tua di rumah',
    q: '"Apakah asap hari ini berisiko untuk keluarga saya?"',
    a: 'Family Siaga menandai anak & lansia sebagai prioritas dan menyusun persiapan rumah tangga.',
  },
  {
    emoji: '👷',
    name: 'Budi, 45',
    role: 'Pekerja lapangan, 8 jam di luar',
    q: '"Kapan waktu kerja di luar yang lebih aman?"',
    a: 'Indeks per jam menggabungkan petir, panas & PM2.5 untuk merekomendasikan jadwal istirahat.',
  },
];

const SDGS = [
  {
    n: '13',
    title: 'Penanganan Perubahan Iklim',
    text: '13.1 — ketahanan & adaptasi terhadap bencana iklim',
    color: '#3F7E44',
  },
  {
    n: '11',
    title: 'Kota & Permukiman Berkelanjutan',
    text: '11.5 — mengurangi dampak bencana bagi warga',
    color: '#FD9D24',
  },
  {
    n: '3',
    title: 'Kehidupan Sehat & Sejahtera',
    text: '3.9 & 3.d — paparan polusi & peringatan dini kesehatan',
    color: '#4C9F38',
  },
  {
    n: '15',
    title: 'Ekosistem Daratan',
    text: 'Pemantauan titik panas & pelaporan dini karhutla',
    color: '#56C02B',
  },
];

export default function LandingPage() {
  useDocumentTitle('Kenali Risiko. Pahami Dampaknya. Ambil Tindakan.');
  const navigate = useNavigate();
  const { locate, busy } = useGeolocation();
  const setScenario = useSettings((s) => s.setScenario);
  const hotspots = useHotspotsQuery();
  const warnings = useWarningsQuery();
  const quakes = useEarthquakesQuery();

  const stats = useMemo(() => {
    const list = hotspots.data?.hotspots ?? [];
    const now = Date.now();
    return {
      h24: list.filter((h) => now - new Date(h.time).getTime() <= 86_400_000).length,
      h7: list.length,
      dots: list.filter((_, i) => i % Math.max(1, Math.ceil(list.length / 700)) === 0),
    };
  }, [hotspots.data]);

  const checkLocation = async () => {
    const l = await locate();
    navigate('/app', { state: { from: 'landing', located: !!l } });
  };

  return (
    <div className="overflow-x-clip bg-canvas">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="SiagaAI">
            <Logo />
          </Link>
          <nav
            className="ml-6 hidden items-center gap-6 text-[14px] font-medium text-neutral-600 md:flex"
            aria-label="Navigasi landing"
          >
            <a href="#cara-kerja" className="hover:text-ink">
              Cara kerja
            </a>
            <a href="#fitur" className="hover:text-ink">
              Fitur
            </a>
            <a href="#teknologi" className="hover:text-ink">
              Teknologi
            </a>
            <a href="#dampak" className="hover:text-ink">
              Dampak & SDGs
            </a>
          </nav>
          <div className="flex-1" />
          <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
            <Link to="/app/map">Siaga Map</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/app">
              Buka aplikasi <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="relative overflow-hidden">
        <NusantaraBackdrop />
        <div
          className="absolute -left-40 top-20 size-[520px] rounded-full bg-brand/[0.06] blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -right-40 top-40 size-[420px] rounded-full bg-ai/[0.06] blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-700 shadow-soft">
              <MerahPutih className="w-7" /> Indonesia&apos;s AI-Powered Personal Disaster Intelligence
            </p>
            <h1 className="text-balance mt-6 text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[56px] lg:text-[64px]">
              Kenali Risiko.
              <br />
              Pahami Dampaknya.
              <br />
              <span className="text-brand">Ambil Tindakan.</span>
            </h1>
            <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-muted">
              Know the Risk · Understand the Impact · Take Action
            </p>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-neutral-600">
              SiagaAI mengubah data kebencanaan & lingkungan Indonesia — titik panas satelit, cuaca BMKG,
              kualitas udara — menjadi <b className="text-ink">informasi risiko personal</b> dan{' '}
              <b className="text-ink">rencana aksi</b> yang mudah dipahami, sesuai lokasi dan aktivitas Anda.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={checkLocation} disabled={busy} className="h-13 px-7 text-[15px]">
                {busy ? <Loader2 className="animate-spin" /> : <LocateFixed />} Cek Lokasi Saya
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-13 px-7 text-[15px]">
                <Link to="/app/map">
                  <MapIcon /> Jelajahi Siaga Map
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-[12.5px] text-muted">
              Tanpa login · GPS tidak disimpan · Gratis untuk publik
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-neutral-500">
              <span>Didukung data terbuka:</span>
              <span className="text-neutral-700">BMKG</span>
              <span className="text-neutral-700">NASA FIRMS</span>
              <span className="text-neutral-700">Copernicus CAMS</span>
              <span className="text-neutral-700">GloFAS</span>
              <span className="text-neutral-700">OpenStreetMap</span>
            </div>
          </div>

          {/* Live Nusantara visual */}
          <div className="relative">
            <div className="relative rounded-[28px] border border-line bg-white/70 p-4 shadow-lift backdrop-blur-sm sm:p-6">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-muted">
                  <Radar className="size-4 text-brand" /> Titik panas satelit · 7 hari
                </p>
                <FreshnessBadge provenance={hotspots.data?.provenance} kind="hotspots" />
              </div>
              <div className="relative mt-3">
                <IndonesiaSilhouette
                  className="w-full text-neutral-200"
                  fill="#E9ECEF"
                  stroke="#D4D8DD"
                  strokeWidth={0.6}
                />
                <svg
                  viewBox={`0 0 ${SILHOUETTE_VIEWBOX.width} ${SILHOUETTE_VIEWBOX.height}`}
                  className="absolute inset-0 h-full w-full"
                  aria-label={`${stats.h7} titik panas terdeteksi dalam 7 hari terakhir`}
                  role="img"
                >
                  {stats.dots.map((h, i) => {
                    const p = projectToSilhouette(h.lon, h.lat);
                    const fresh = Date.now() - new Date(h.time).getTime() < 86_400_000;
                    return (
                      <circle
                        key={h.id}
                        cx={p.x}
                        cy={p.y}
                        r={fresh ? 3.2 : 2.2}
                        fill={fresh ? '#DC2626' : '#F97316'}
                        opacity={fresh ? 0.85 : 0.45}
                        className={fresh && i % 9 === 0 ? 'animate-pulse' : undefined}
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <HeroStat
                  label="Titik panas 24 jam"
                  value={hotspots.data ? stats.h24.toLocaleString('id-ID') : '…'}
                />
                <HeroStat
                  label="Peringatan BMKG aktif"
                  value={warnings.data ? String(warnings.data.warnings.length) : warnings.isError ? '–' : '…'}
                />
                <HeroStat
                  label="Gempa terbaru"
                  value={quakes.data?.latest ? `M${quakes.data.latest.magnitude}` : '…'}
                  sub={quakes.data?.latest ? timeAgo(quakes.data.latest.time) : undefined}
                />
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden w-64 rounded-2xl border border-indigo-100 bg-white p-4 shadow-float sm:block lg:-left-10">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ai">
                <Sparkles className="size-3.5" /> SiagaAI menjawab
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-neutral-700">
                "Berangkat sebelum 07.00 — hujan & asap paling rendah. Bawa masker & jas hujan."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wider text-brand">Masalahnya</p>
            <h2 className="text-balance mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              Indonesia tidak kekurangan informasi bencana. Yang kurang adalah pemahaman personal.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-neutral-600">
              Indonesia berada di Cincin Api Pasifik dan termasuk negara dengan risiko bencana tertinggi di
              dunia (WorldRiskReport). Kebakaran hutan dan lahan pada 2019 saja menghanguskan ±1,6 juta
              hektare (KLHK) dan memicu kabut asap lintas wilayah. Data dari BMKG, BNPB, dan satelit tersedia
              — tetapi masih teknis, terpisah-pisah, dan generik.
            </p>
          </div>
          <div className="space-y-3">
            <GapCard
              tone="muted"
              label="Informasi yang diterima warga"
              text={'"Terdapat 24 titik panas." · "Potensi hujan lebat."'}
            />
            <div className="flex justify-center text-muted" aria-hidden>
              ↓
            </div>
            <GapCard
              tone="muted"
              label="Pertanyaan yang belum terjawab"
              text="Apakah saya terdampak? Seberapa besar risiko saya? Bagaimana keluarga saya? Apa yang harus saya lakukan sekarang?"
            />
            <div className="flex justify-center text-muted" aria-hidden>
              ↓
            </div>
            <GapCard
              tone="ai"
              label="SiagaAI"
              text="Skor risiko personal 0–100 + dampak pada aktivitas Anda + rencana aksi yang bisa langsung dicentang."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="cara-kerja" className="relative overflow-hidden">
        <div className="bg-topo absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[13px] font-bold uppercase tracking-wider text-brand">Cara kerja</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Detect → Understand → Personalize → Act</h2>
            <p className="mt-3 text-[16px] text-neutral-600">
              Dari peringatan dini menuju tindakan dini — empat tahap yang konsisten di seluruh pengalaman
              SiagaAI.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className="group relative rounded-card border border-line bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'grid size-11 place-items-center rounded-xl',
                      i === 3
                        ? 'bg-brand text-white'
                        : i === 2
                          ? 'bg-ai text-white'
                          : 'bg-neutral-100 text-ink',
                    )}
                  >
                    <s.icon className="size-5" />
                  </span>
                  <span className="text-[28px] font-extrabold text-neutral-200">{s.n}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">
                  {s.title} <span className="text-[13px] font-medium text-muted">· {s.id}</span>
                </h3>
                <p className="mt-1 text-[13px] font-semibold text-ai">{s.q}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-[13px] font-bold uppercase tracking-wider text-brand">Fitur</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Satu aplikasi, dari data mentah ke langkah nyata
              </h2>
            </div>
            <Button asChild variant="secondary">
              <Link to="/app">
                Coba sekarang <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-card border border-line p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50/60"
              >
                <f.icon className="size-5 text-brand" />
                <h3 className="mt-3 text-[15px] font-bold">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="text-[13px] font-bold uppercase tracking-wider text-brand">Untuk siapa</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
          Bahaya yang sama, jawaban yang berbeda untuk setiap orang
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PERSONAS.map((p) => (
            <figure
              key={p.name}
              className="flex flex-col rounded-card border border-line bg-white p-6 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid size-12 place-items-center rounded-2xl bg-neutral-100 text-2xl"
                  aria-hidden
                >
                  {p.emoji}
                </span>
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-[13px] text-muted">{p.role}</p>
                </div>
              </div>
              <blockquote className="mt-4 text-[16px] font-semibold leading-snug">{p.q}</blockquote>
              <figcaption className="mt-3 flex gap-2 rounded-xl bg-ai-soft/60 p-3 text-[13.5px] leading-relaxed text-indigo-950">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" /> {p.a}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {Object.values(SCENARIOS).map((s) => (
            <Button
              key={s.id}
              variant="ai-soft"
              className="h-auto min-h-11 whitespace-normal py-2.5 text-left"
              onClick={() => {
                setScenario(s.id);
                navigate('/app');
              }}
            >
              {s.emoji} Coba skenario: {s.title}
            </Button>
          ))}
        </div>
      </section>

      {/* TECH */}
      <section id="teknologi" className="relative overflow-hidden bg-ink text-white">
        <div className="bg-batik absolute inset-0 opacity-[0.05] invert" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wider text-red-400">Teknologi</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Algorithm calculates. AI communicates.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/70">
              LLM tidak pernah menentukan skor risiko. Siaga Risk Engine yang deterministik, teruji &
              terdokumentasi menghitung setiap angka dari data nyata. AI menerima konteks terstruktur lalu
              menjelaskan dan merekomendasikan — dengan keluaran JSON yang divalidasi skema.
            </p>
            <ul className="mt-6 space-y-3 text-[14px] text-white/80">
              {[
                [ShieldCheck, 'Kunci API hanya di server — PWA → gateway serverless → Gemini / Groq'],
                [
                  Layers,
                  'React · TypeScript · MapLibre GL · TanStack Query · Supabase (Auth, Postgres RLS, Realtime)',
                ],
                [
                  WifiOff,
                  'PWA offline-first: rencana aksi & tas siaga tetap tersedia, data lama selalu diberi label',
                ],
                [Cpu, 'Local Reasoner cadangan — fitur AI tetap berfungsi tanpa koneksi atau kunci'],
              ].map(([Icon, text]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <li key={text as string} className="flex gap-3">
                    <I className="mt-0.5 size-4 shrink-0 text-red-400" /> {text as string}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 font-mono text-[12.5px] leading-relaxed text-white/80">
            <p className="text-white/40">{'// Pipeline SiagaAI'}</p>
            {[
              ['BMKG · NASA FIRMS · CAMS · GloFAS', 'text-white'],
              ['↓ normalisasi sinyal', 'text-white/40'],
              ['Siaga Risk Engine  (bobot · kurva · cakupan)', 'text-amber-300'],
              ['↓ skor bahaya 0–100', 'text-white/40'],
              ['× Pengubah paparan personal (0,8–1,3)', 'text-indigo-300'],
              ['↓ Indicative Siaga Score', 'text-white/40'],
              ['LLM (konteks JSON → skema tervalidasi)', 'text-indigo-300'],
              ['↓', 'text-white/40'],
              ['Brief · Dampak personal · Rencana aksi · Q&A', 'text-red-300'],
            ].map(([t, c]) => (
              <p key={t} className={cn('py-0.5', c)}>
                {t}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* SDGs */}
      <section id="dampak" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="text-[13px] font-bold uppercase tracking-wider text-brand">Dampak</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold sm:text-4xl">
          Mitigasi bencana & perubahan iklim, dari warga untuk warga
        </h2>
        <p className="mt-3 max-w-2xl text-[16px] text-neutral-600">
          Sejalan dengan Kerangka Sendai (memahami risiko & kesiapsiagaan) serta inisiatif PBB "Early Warnings
          for All".
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SDGS.map((s) => (
            <div key={s.n} className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
              <div className="flex items-center gap-3 px-5 py-4 text-white" style={{ background: s.color }}>
                <span className="text-3xl font-extrabold">{s.n}</span>
                <span className="text-[13px] font-bold leading-tight">{s.title}</span>
              </div>
              <p className="p-5 text-[13.5px] leading-relaxed text-neutral-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-brand px-6 py-14 text-center text-white sm:px-12">
          <div className="bg-batik absolute inset-0 opacity-[0.08] invert" aria-hidden />
          <IndonesiaSilhouette className="absolute inset-x-0 -bottom-10 mx-auto w-[120%] max-w-none text-white/10" />
          <div className="relative">
            <h2 className="text-balance text-3xl font-bold sm:text-4xl">
              Dari peringatan dini menuju tindakan dini.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Cek kondisi lokasi Anda sekarang — gratis, tanpa akun, dalam hitungan detik.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                onClick={checkLocation}
                disabled={busy}
                className="border-0"
              >
                {busy ? <Loader2 className="animate-spin" /> : <LocateFixed />} Cek Lokasi Saya
              </Button>
              <Button asChild size="lg" variant="dark">
                <Link to="/app/map">
                  <MapIcon /> Jelajahi Siaga Map
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-[13px] text-muted">
              SiagaAI — AI-Powered Personal Disaster Intelligence. Karya IT RUSH 2026 · Sub tema Mitigasi
              Bencana dan Perubahan Iklim.
            </p>
          </div>
          <div className="text-[13px]">
            <p className="font-bold">Aplikasi</p>
            <ul className="mt-2 space-y-1.5 text-muted">
              <li>
                <Link to="/app" className="hover:text-ink">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/app/map" className="hover:text-ink">
                  Siaga Map
                </Link>
              </li>
              <li>
                <Link to="/app/risk" className="hover:text-ink">
                  Risiko Saya
                </Link>
              </li>
              <li>
                <Link to="/app/about" className="hover:text-ink">
                  Data & Metodologi
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-[13px] text-muted">
            <p className="font-bold text-ink">Atribusi data</p>
            <p className="mt-2">
              Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) · NASA FIRMS · Copernicus CAMS &
              GloFAS via Open-Meteo (CC BY 4.0) · © OpenStreetMap contributors.
            </p>
          </div>
        </div>
        <div className="border-t border-line px-4 py-5 sm:px-6">
          <Disclaimer className="mx-auto max-w-7xl" />
        </div>
      </footer>
    </div>
  );
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
      <p className="tabular text-[20px] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-medium leading-tight text-muted">{label}</p>
      {sub && <p className="text-[10.5px] text-muted">{sub}</p>}
    </div>
  );
}

function GapCard({ label, text, tone }: { label: string; text: ReactNode; tone: 'muted' | 'ai' }) {
  return (
    <div
      className={cn(
        'rounded-card border p-5',
        tone === 'ai' ? 'border-indigo-200 bg-ai-soft/60' : 'border-line bg-neutral-50',
      )}
    >
      <p
        className={cn(
          'text-[12px] font-bold uppercase tracking-wider',
          tone === 'ai' ? 'text-ai' : 'text-muted',
        )}
      >
        {label}
      </p>
      <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-ink">{text}</p>
    </div>
  );
}
