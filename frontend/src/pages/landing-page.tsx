import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CloudOff,
  Cpu,
  Flame,
  KeyRound,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  Megaphone,
  Menu,
  Radar,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ara, type AraPose } from '@/components/common/ara';
import { IndonesiaSilhouette, Logo, NusantaraBackdrop, projectToSilhouette } from '@/components/common/brand';
import { FreshnessBadge } from '@/components/common/data-state';
import { Disclaimer } from '@/components/common/layout-bits';
import { BackToTop, Reveal } from '@/components/common/reveal';
import { RiskSpectrum } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { SCENARIOS } from '@/data/scenarios';
import { SILHOUETTE_VIEWBOX } from '@/data/silhouette';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useDocumentTitle } from '@/hooks/use-misc';
import { useEarthquakesQuery, useHotspotsQuery, useWarningsQuery } from '@/hooks/use-siaga-data';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useSettings } from '@/stores';
import { locale, t } from '@/lib/i18n';
import { PreferenceToggles } from '@/features/preferences/toggles';

const nav = () =>
  [
    ['#cara-kerja', t('Cara kerja', 'How it works')],
    ['#fitur', t('Fitur', 'Features')],
    ['#teknologi', t('Teknologi', 'Technology')],
    ['#dampak', t('Dampak', 'Impact')],
  ] as const;

/** Each step shows the active-language name with the other language as a subtle tag. */
const steps = (): { n: string; title: string; tag: string; text: string; pose: AraPose }[] => [
  {
    n: '01',
    title: t('Deteksi', 'Detect'),
    tag: t('Detect', 'Deteksi'),
    text: t('Satelit NASA, cuaca BMKG & kualitas udara digabung.', 'NASA satellites, BMKG weather & air quality combined.'),
    pose: 'explore',
  },
  {
    n: '02',
    title: t('Pahami', 'Understand'),
    tag: t('Understand', 'Pahami'),
    text: t('Risk Engine mengubah sinyal jadi skor 0–100.', 'The Risk Engine turns signals into a 0–100 score.'),
    pose: 'thinking',
  },
  {
    n: '03',
    title: t('Personal', 'Personalize'),
    tag: t('Personalize', 'Personal'),
    text: t('Disesuaikan pekerjaan, transportasi & keluarga.', 'Tailored to your occupation, transport & family.'),
    pose: 'tablet',
  },
  {
    n: '04',
    title: t('Bertindak', 'Act'),
    tag: t('Act', 'Bertindak'),
    text: t('Rencana aksi konkret yang bisa langsung dicentang.', 'A concrete action plan you can tick off right away.'),
    pose: 'checklist',
  },
];

const personas = () => [
  {
    name: 'Raka',
    role: t('Mahasiswa · naik motor', 'Student · rides a motorcycle'),
    q: t('Aman berangkat kampus pagi ini?', 'Is it safe to head to campus this morning?'),
    a: t('Berangkat sebelum 07.00 — hujan & asap paling rendah.', 'Leave before 07:00 — rain & smoke are lowest.'),
  },
  {
    name: 'Sari',
    role: t('Ibu · anak & lansia di rumah', 'Mother · kids & older adults at home'),
    q: t('Asap hari ini berbahaya untuk keluarga?', 'Is today’s smoke dangerous for my family?'),
    a: t('Anak & lansia diprioritaskan, tutup ventilasi siang hari.', 'Prioritise kids & older adults, close vents at midday.'),
  },
  {
    name: 'Budi',
    role: t('Pekerja lapangan · 8 jam di luar', 'Field worker · 8 hours outdoors'),
    q: t('Kapan waktu kerja luar paling aman?', 'When is the safest time to work outdoors?'),
    a: t('Istirahat 13.00–15.00 — potensi petir & panas tertinggi.', 'Rest 13:00–15:00 — lightning & heat risk peak.'),
  },
];

const marquee = () => [
  t('Kenali Risiko', 'Know the Risk'),
  t('Pahami Dampaknya', 'Understand the Impact'),
  t('Ambil Tindakan', 'Take Action'),
  'BMKG',
  'NASA FIRMS',
  'Copernicus CAMS',
  'GloFAS',
  'Offline-ready PWA',
];

export default function LandingPage() {
  useDocumentTitle(t('Kenali Risiko. Pahami Dampaknya. Ambil Tindakan.', 'Know the Risk. Understand the Impact. Take Action.'));
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
      dots: list.filter((_, i) => i % Math.max(1, Math.ceil(list.length / 800)) === 0),
    };
  }, [hotspots.data]);

  const checkLocation = async () => {
    const l = await locate();
    navigate('/app', { state: { from: 'landing', located: !!l } });
  };

  const h24 = hotspots.data ? stats.h24.toLocaleString(locale()) : '…';
  const MARQUEE = marquee();
  const warnCount = warnings.data ? String(warnings.data.warnings.length) : warnings.isError ? '–' : '…';
  const quake = quakes.data?.latest;

  return (
    <div className="overflow-x-clip bg-canvas">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-inverse focus:px-3 focus:py-2 focus:text-on-inverse"
      >
        {t('Lewati ke konten', 'Skip to content')}
      </a>
      <LandingNav />

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section id="hero" className="relative">
        <NusantaraBackdrop />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(55%_50%_at_78%_38%,rgb(215_25_32/0.07),transparent_70%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-[1360px] items-center gap-6 px-5 pb-10 pt-28 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:pb-14 lg:pt-32">
          <div className="animate-fade-up lg:col-span-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3 text-[12px] font-semibold text-neutral-700 shadow-soft backdrop-blur">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-brand-dark">
                <span className="size-1.5 animate-pulse rounded-full bg-brand" /> Live
              </span>
              Personal Disaster Intelligence · Indonesia
            </p>
            <h1 className="text-balance mt-7 text-[44px] font-extrabold leading-[1.02] tracking-[-0.045em] text-ink sm:text-[60px] xl:text-[68px]">
              {t('Kenali Risiko.', 'Know the Risk.')}
              <br />
              <span className="text-neutral-400 dark:text-neutral-500">{t('Pahami Dampaknya.', 'Understand the Impact.')}</span>
              <br />
              <span className="text-brand">{t('Ambil Tindakan.', 'Take Action.')}</span>
            </h1>
            <p className="text-pretty mt-6 max-w-lg text-[17px] leading-relaxed text-neutral-600">
              {t('Data bencana Indonesia, diterjemahkan menjadi', "Indonesia's disaster data, translated into")}{' '}
              <b className="font-semibold text-ink">{t('risiko personal', 'personal risk')}</b> {t('dan', 'and')}{' '}
              <b className="font-semibold text-ink">{t('langkah nyata', 'real actions')}</b>{' '}
              {t('— untuk lokasimu, hari ini.', '— for your location, today.')}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={checkLocation} disabled={busy} className="h-[52px] px-7 text-[15px]">
                {busy ? <Loader2 className="animate-spin" /> : <LocateFixed />} {t('Cek Lokasi Saya', 'Check My Location')}
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-[52px] px-7 text-[15px]">
                <Link to="/app/map">
                  <MapIcon /> {t('Jelajahi Siaga Map', 'Explore Siaga Map')}
                </Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
              {[t('Tanpa login', 'No login'), t('GPS tidak disimpan', 'GPS not stored'), t('Gratis', 'Free')].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-risk-safe" strokeWidth={2.6} /> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Ara + live orbit */}
          <div className="relative mx-auto flex aspect-square w-full max-w-[500px] items-center justify-center lg:col-span-5">
            <div
              className="absolute inset-[3%] rounded-full border border-dashed border-line-strong/80"
              aria-hidden
            />
            <div
              className="absolute inset-[18%] animate-spin-slow rounded-full border border-dashed border-brand/25"
              aria-hidden
            >
              <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-brand" />
            </div>
            <div
              className="absolute inset-[28%] rounded-full bg-[radial-gradient(circle,rgb(215_25_32/0.12),transparent_70%)]"
              aria-hidden
            />
            <Ara
              pose="hero-ready"
              size={400}
              priority
              className="relative z-10 !h-[80%] !w-auto"
              alt={t('Ara, maskot SiagaAI', 'Ara, the SiagaAI mascot')}
            />
            <OrbitChip
              className="left-0 top-[12%] animate-[float_6s_ease-in-out_infinite]"
              icon={<Flame className="text-hz-fire" />}
              value={h24}
              label={t('Titik panas · 24 jam', 'Hotspots · 24 h')}
            />
            <OrbitChip
              className="right-0 top-[42%] animate-[float_7s_ease-in-out_0.6s_infinite]"
              icon={<TriangleAlert className="text-risk-moderate" />}
              value={warnCount}
              label={t('Peringatan BMKG', 'BMKG warnings')}
            />
            <OrbitChip
              className="bottom-[6%] left-[2%] animate-[float_6.5s_ease-in-out_1.2s_infinite]"
              icon={<Radar className="text-risk-critical" />}
              value={quake ? `M${quake.magnitude}` : '…'}
              label={quake ? `${t('Gempa', 'Quake')} · ${timeAgo(quake.time)}` : t('Gempa terbaru', 'Latest quake')}
            />
          </div>
        </div>

        {/* Tilted marquee ribbon */}
        <div className="relative z-10 -mx-4 mt-2 -rotate-[1.6deg] overflow-hidden border-y border-brand-dark bg-brand py-4 shadow-[0_16px_40px_-12px_rgb(163_19_25/0.45)]">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE].map((word, i) => (
              <span
                key={i}
                className="flex items-center gap-10 text-[22px] font-bold tracking-[-0.02em] text-white sm:text-[26px]"
              >
                {word}
                <Sparkles className="size-5 text-white/60" aria-hidden />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LIVE INDONESIA ───────────────────────────────────── */}
      <section className="relative pb-20 pt-24 sm:pb-28 sm:pt-32">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="telemetry !text-brand">{t('Indonesia hari ini', 'Indonesia today')}</p>
              <h2 className="text-balance mt-3 max-w-xl text-[32px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[44px]">
                {t('Setiap titik adalah sinyal nyata.', 'Every dot is a real signal.')}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <FreshnessBadge provenance={hotspots.data?.provenance} kind="hotspots" showSource />
              <Button asChild variant="secondary" size="sm" className="rounded-full">
                <Link to="/app/map">
                  {t('Buka peta', 'Open map')} <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </Reveal>

          <Reveal
            delay={100}
            className="relative mt-10 overflow-hidden rounded-[24px] border border-line bg-surface p-5 shadow-soft sm:p-10"
          >
            <div className="bg-dots absolute inset-0 opacity-60" aria-hidden />
            <div className="relative">
              <IndonesiaSilhouette
                className="w-full"
                fill="var(--color-neutral-100)"
                stroke="var(--color-line-strong)"
                strokeWidth={0.6}
              />
              <svg
                viewBox={`0 0 ${SILHOUETTE_VIEWBOX.width} ${SILHOUETTE_VIEWBOX.height}`}
                className="absolute inset-0 h-full w-full"
                aria-label={t(
                  `${stats.h7} titik panas terdeteksi dalam 7 hari terakhir`,
                  `${stats.h7} hotspots detected in the last 7 days`,
                )}
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
                      r={fresh ? 3.2 : 2.1}
                      fill={fresh ? '#C62A1F' : '#E66B24'}
                      opacity={fresh ? 0.85 : 0.4}
                      className={fresh && i % 9 === 0 ? 'animate-pulse' : undefined}
                    />
                  );
                })}
              </svg>
            </div>
            <dl className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
              <Stat
                label={t('Titik panas · 7 hari', 'Hotspots · 7 days')}
                value={hotspots.data ? stats.h7.toLocaleString(locale()) : '…'}
              />
              <Stat label={t('Titik panas · 24 jam', 'Hotspots · 24 h')} value={h24} accent />
              <Stat label={t('Peringatan BMKG', 'BMKG warnings')} value={warnCount} />
              <Stat
                label={t('Gempa terbaru', 'Latest quake')}
                value={quake ? `M${quake.magnitude}` : '…'}
                sub={quake ? timeAgo(quake.time) : undefined}
              />
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="cara-kerja" className="relative border-y border-line bg-surface py-24 sm:py-28">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <Reveal className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="telemetry !text-brand">{t('Cara kerja', 'How it works')}</p>
              <h2 className="text-balance mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[44px]">
                {t('Dari peringatan dini ke tindakan dini.', 'From early warning to early action.')}
              </h2>
            </div>
            <p className="text-pretty self-end text-[16px] leading-relaxed text-muted lg:col-span-4 lg:col-start-9">
              {t('Algoritma menghitung, AI menjelaskan — kamu tinggal bertindak.', 'The algorithm calculates, AI explains — you just act.')}
            </p>
          </Reveal>

          <ol className="mt-14 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {steps().map((s, i) => (
              <Reveal
                as="li"
                key={s.n}
                delay={i * 90}
                className="group relative flex flex-col bg-surface p-6 sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[44px] font-medium leading-none tracking-[-0.04em] text-line-strong transition-colors duration-300 group-hover:text-brand">
                    {s.n}
                  </span>
                  <Ara
                    pose={s.pose}
                    size={100}
                    className="-mr-2 -mt-2 transition-transform duration-300 group-hover:-translate-y-1"
                  />
                </div>
                <h3 className="mt-6 text-[20px] font-bold tracking-[-0.02em]">
                  {s.title}{' '}
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
                    / {s.tag}
                  </span>
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── FEATURES (bento) ─────────────────────────────────── */}
      <section id="fitur" className="py-24 sm:py-28">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="telemetry !text-brand">{t('Fitur', 'Features')}</p>
              <h2 className="text-balance mt-3 max-w-2xl text-[32px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[44px]">
                {t('Satu aplikasi, dari data mentah ke langkah nyata.', 'One app, from raw data to real action.')}
              </h2>
            </div>
            <Button asChild variant="dark" className="self-start rounded-full md:self-auto">
              <Link to="/app">
                {t('Coba sekarang', 'Try it now')} <ArrowRight />
              </Link>
            </Button>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-6 lg:gap-5">
            <Bento
              className="md:col-span-4"
              to="/app"
              label="Siaga Score"
              title={t('Seberapa berisiko lokasimu — dalam satu angka.', 'How risky your location is — in a single number.')}
            >
              <div className="mt-6 flex items-end gap-5">
                <span className="display-metric text-[72px]">42</span>
                <span className="mb-3 text-[20px] font-extrabold uppercase text-risk-moderate">{t('Sedang', 'Moderate')}</span>
              </div>
              <RiskSpectrum score={42} className="mt-4 max-w-sm" />
              <Ara pose="tablet" size={160} className="absolute -bottom-3 right-6 hidden sm:block" />
            </Bento>

            <Bento
              className="md:col-span-2"
              to="/app"
              label={t('Tanya Ara', 'Ask Ara')}
              title={t('Asisten AI yang paham konteksmu.', 'An AI assistant that understands your context.')}
            >
              <div className="mt-5 space-y-2 text-[12.5px]">
                <p className="ml-6 rounded-2xl rounded-br-md bg-inverse px-3 py-2 text-on-inverse">
                  {t('Aman naik motor jam 8?', 'Safe to ride my motorcycle at 8?')}
                </p>
                <p className="mr-4 rounded-2xl rounded-bl-md border border-line bg-raised px-3 py-2 text-neutral-700">
                  {t('Bisa, tapi bawa jas hujan — hujan mulai 09.00. ✦', 'Yes, but bring a raincoat — rain starts at 09:00. ✦')}
                </p>
              </div>
            </Bento>

            <Bento
              className="md:col-span-2"
              to="/app/action-plan"
              label={t('Rencana Aksi', 'Action Plan')}
              title={t('Langkah yang bisa dicentang.', 'Steps you can tick off.')}
            >
              <MiniChecklist />
            </Bento>

            <Bento
              className="md:col-span-2"
              to="/app/map"
              label="Siaga Map"
              title={t('Titik panas, cuaca, gempa & laporan warga.', 'Hotspots, weather, quakes & community reports.')}
            >
              <div className="relative mt-5 h-24 overflow-hidden rounded-xl border border-line bg-[#EEF1F4] dark:bg-[#131517]">
                <div className="bg-dots absolute inset-0" />
                {(
                  [
                    [22, 40, 'bg-[#C62A1F]'],
                    [48, 62, 'bg-[#E66B24]'],
                    [70, 30, 'bg-[#C62A1F]'],
                    [60, 70, 'bg-[#D99A22]'],
                  ] as const
                ).map(([x, y, c], i) => (
                  <span key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
                    <span className={cn('absolute -inset-2 animate-pulse-ring rounded-full opacity-40', c)} />
                    <span className={cn('relative block size-2.5 rounded-full ring-2 ring-surface', c)} />
                  </span>
                ))}
              </div>
            </Bento>

            <Bento
              className="md:col-span-2"
              to="/app/family"
              label={t('Keluarga Siaga', 'Family Siaga')}
              title={t('Prioritas untuk anak & lansia.', 'Priority for children & older adults.')}
            >
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex -space-x-2">
                  {['N', 'A', 'B', 'K'].map((c, i) => (
                    <span
                      key={c}
                      className={cn(
                        'grid size-9 place-items-center rounded-full text-[12px] font-bold ring-2 ring-surface',
                        i === 0 ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-700',
                      )}
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-risk-high">
                  {t('2 perlu perhatian', '2 need attention')}
                </span>
              </div>
            </Bento>

            <Bento
              className="md:col-span-3"
              to="/app/community"
              label={t('Laporan Warga', 'Community Reports')}
              title={t('Sinyal dari lapangan, selalu diberi label.', 'Signals from the ground, always labelled.')}
              icon={<Megaphone />}
            >
              <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--risk-moderate-soft)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--risk-moderate-text)] ring-1 ring-inset ring-risk-moderate/25">
                {t('Belum terverifikasi', 'Unverified')}
              </p>
            </Bento>
            <Bento
              className="md:col-span-3"
              to="/app/action-plan"
              label="PWA · Offline"
              title={t('Rencana & tas siaga tetap ada tanpa sinyal.', 'Plans & go-bag stay available without signal.')}
              icon={<CloudOff />}
            >
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
                {t('Instal ke layar utama →', 'Install to home screen →')}
              </p>
            </Bento>
          </div>
        </div>
      </section>

      {/* ─── PERSONAS ─────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-24 sm:py-28">
        <div className="mx-auto grid max-w-[1360px] gap-12 px-5 sm:px-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="telemetry !text-brand">{t('Untuk siapa', 'Who it is for')}</p>
            <h2 className="text-balance mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[40px]">
              {t('Bahaya sama, jawaban berbeda.', 'Same hazard, different answers.')}
            </h2>
            <Ara pose="family" size={200} className="mt-10 hidden lg:block" />
          </Reveal>
          <div className="lg:col-span-8">
            <div className="divide-y divide-line border-y border-line">
              {personas().map((p, i) => (
                <Reveal
                  key={p.name}
                  delay={i * 80}
                  className="grid gap-4 py-7 sm:grid-cols-[180px_1fr] sm:gap-8"
                >
                  <div>
                    <p className="text-[17px] font-bold">{p.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted">{p.role}</p>
                  </div>
                  <div>
                    <p className="text-[19px] font-semibold leading-snug tracking-[-0.015em]">“{p.q}”</p>
                    <p className="mt-3 flex items-start gap-2 text-[14.5px] leading-relaxed text-neutral-600">
                      <Sparkles className="mt-1 size-4 shrink-0 text-ai" aria-hidden />
                      {p.a}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-6">
              <span className="data-label mr-2">{t('Coba simulasi', 'Try a simulation')}</span>
              {Object.values(SCENARIOS).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setScenario(s.id);
                    navigate('/app');
                  }}
                  className="rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-ai/30 hover:bg-ai-soft/50"
                >
                  {s.emoji} {s.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TECH ─────────────────────────────────────────────── */}
      <section id="teknologi" className="relative overflow-hidden bg-night py-24 text-white sm:py-28">
        <NusantaraBackdrop variant="dark" />
        <div className="relative mx-auto grid max-w-[1360px] gap-14 px-5 sm:px-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-red-300">{t('Teknologi', 'Technology')}</p>
            <h2 className="text-balance mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[44px]">
              {t('Algoritma menghitung.', 'The algorithm calculates.')}
              <br />
              <span className="text-white/45">{t('AI menjelaskan.', 'AI explains.')}</span>
            </h2>
            <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {(
                [
                  [Cpu, t('Skor deterministik', 'Deterministic scores'), t('LLM tidak pernah menentukan angka risiko.', 'The LLM never decides risk numbers.')],
                  [KeyRound, t('Kunci di server', 'Keys on the server'), t('PWA → gateway serverless → Gemini / Groq.', 'PWA → serverless gateway → Gemini / Groq.')],
                  [CloudOff, 'Offline-first', t('Data lama selalu diberi label jelas.', 'Older data is always clearly labelled.')],
                  [ShieldCheck, t('Cadangan lokal', 'Local fallback'), t('Fitur AI tetap jalan tanpa koneksi.', 'AI features keep working offline.')],
                ] as const
              ).map(([I, title, d]) => (
                <li key={title} className="border-t border-white/10 pt-4">
                  <I className="size-5 text-red-300" aria-hidden />
                  <p className="mt-3 text-[15px] font-semibold">{title}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-white/55">{d}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-5 lg:col-start-8">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-6 font-mono text-[12.5px] leading-relaxed sm:p-8">
              <p className="mb-3 text-white/35">{'// pipeline siagaai'}</p>
              {[
                ['BMKG · NASA FIRMS · CAMS · GloFAS', 'text-white'],
                [t('↓ normalisasi sinyal', '↓ signal normalisation'), 'text-white/35'],
                ['Siaga Risk Engine', 'text-amber-300'],
                [t('↓ skor bahaya 0–100', '↓ hazard score 0–100'), 'text-white/35'],
                [t('× paparan personal (0,8–1,3)', '× personal exposure (0.8–1.3)'), 'text-indigo-300'],
                ['↓ Indicative Siaga Score', 'text-white/35'],
                [t('LLM → skema JSON tervalidasi', 'LLM → validated JSON schema'), 'text-indigo-300'],
                ['↓', 'text-white/35'],
                [t('Brief · Dampak · Rencana aksi', 'Brief · Impact · Action plan'), 'text-red-300'],
              ].map(([line, c]) => (
                <p key={line} className={cn('py-1', c)}>
                  {line}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── IMPACT / SDGs ────────────────────────────────────── */}
      <section id="dampak" className="py-24 sm:py-28">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <Reveal className="grid gap-6 lg:grid-cols-12">
            <h2 className="text-balance text-[32px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[44px] lg:col-span-7">
              {t('Mitigasi bencana & iklim,', 'Disaster & climate mitigation,')}{' '}
              <span className="text-neutral-400 dark:text-neutral-500">{t('dari warga untuk warga.', 'by citizens, for citizens.')}</span>
            </h2>
            <p className="self-end text-[15px] leading-relaxed text-muted lg:col-span-4 lg:col-start-9">
              {t('Sejalan dengan Kerangka Sendai & inisiatif PBB', 'Aligned with the Sendai Framework & the UN')}{' '}
              <i>Early Warnings for All</i>{t('.', ' initiative.')}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['13', t('Aksi Iklim', 'Climate Action'), t('Ketahanan & adaptasi bencana iklim', 'Resilience & adaptation to climate disasters'), '#4E9A53'],
              ['11', t('Kota Berkelanjutan', 'Sustainable Cities'), t('Kurangi dampak bencana bagi warga', 'Reduce disaster impacts on residents'), '#E8890C'],
              ['3', t('Hidup Sehat', 'Good Health'), t('Paparan polusi & peringatan kesehatan', 'Pollution exposure & health warnings'), '#58AE42'],
              ['15', t('Ekosistem Darat', 'Life on Land'), t('Pemantauan dini karhutla', 'Early wildfire monitoring'), '#45B12F'],
            ].map(([n, title, d, c], i) => (
              <Reveal key={n} delay={i * 70} className="bg-surface p-6 sm:p-7">
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">SDG</span>
                  <span className="display-metric text-[44px]" style={{ color: c }}>
                    {n}
                  </span>
                </span>
                <p className="mt-4 text-[16px] font-bold">{title}</p>
                <p className="mt-1 text-[13.5px] text-muted">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="px-5 pb-20 sm:px-8">
        <Reveal className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[28px] bg-brand text-white">
          <NusantaraBackdrop variant="red" />
          <IndonesiaSilhouette className="absolute -bottom-16 -right-20 w-[80%] max-w-none text-white/[0.07]" />
          <div className="relative grid items-end gap-6 px-6 pt-12 sm:px-12 md:grid-cols-[1fr_auto] md:pt-14">
            <div className="pb-12 md:pb-14">
              <h2 className="text-balance max-w-xl text-[32px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[44px]">
                {t('Cek kondisi lokasimu sekarang.', 'Check your location’s conditions now.')}
              </h2>
              <p className="mt-3 text-[16px] text-white/80">
                {t('Gratis, tanpa akun, dalam hitungan detik.', 'Free, no account, in seconds.')}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={checkLocation}
                  disabled={busy}
                  className="border-0"
                >
                  {busy ? <Loader2 className="animate-spin" /> : <LocateFixed />} {t('Cek Lokasi Saya', 'Check My Location')}
                </Button>
                <Button asChild size="lg" variant="dark">
                  <Link to="/auth">{t('Masuk / Akun demo', 'Sign in / Demo account')}</Link>
                </Button>
              </div>
            </div>
            <Ara pose="hero-wave" size={300} className="mx-auto -mb-2 hidden md:block" />
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-muted">
              {t(
                'AI-Powered Personal Disaster Intelligence untuk Indonesia. Karya IT RUSH 2026 — Mitigasi Bencana & Perubahan Iklim.',
                'AI-Powered Personal Disaster Intelligence for Indonesia. An IT RUSH 2026 entry — Disaster Mitigation & Climate Change.',
              )}
            </p>
          </div>
          <FooterCol
            title={t('Aplikasi', 'App')}
            links={[
              ['/app', 'Dashboard'],
              ['/app/map', 'Siaga Map'],
              ['/app/risk', t('Risiko Saya', 'My Risk')],
              ['/app/action-plan', t('Rencana Aksi', 'Action Plan')],
            ]}
          />
          <FooterCol
            title={t('Lainnya', 'More')}
            links={[
              ['/about', t('Tentang SiagaAI', 'About SiagaAI')],
              ['/app/family', t('Keluarga', 'Family')],
              ['/app/community', t('Laporan Warga', 'Community Reports')],
              ['/app/about', t('Data & Metodologi', 'Data & Methodology')],
              ['/auth', t('Masuk', 'Sign in')],
            ]}
          />
          <div className="text-[12.5px] leading-relaxed text-muted md:col-span-3">
            <p className="data-label mb-3 !text-ink">{t('Atribusi data', 'Data attribution')}</p>
            BMKG · NASA FIRMS · Copernicus CAMS & GloFAS via Open-Meteo (CC BY 4.0) · © OpenStreetMap
            contributors.
          </div>
        </div>
        <div className="border-t border-line px-5 py-6 sm:px-8">
          <Disclaimer className="mx-auto max-w-[1360px]" />
        </div>
      </footer>
      <BackToTop />
    </div>
  );
}

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className="fixed inset-x-0 top-[var(--safe-top)] z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={cn(
          'mx-auto flex h-14 max-w-[1360px] items-center gap-3 rounded-full pl-4 pr-2 transition-all duration-300',
          scrolled || open ? 'glass' : 'border border-transparent',
        )}
      >
        <Link to="/" aria-label="SiagaAI" className="shrink-0">
          <Logo />
        </Link>
        <nav
          className="mx-auto hidden items-center gap-1 rounded-full border border-line bg-surface/70 p-1 backdrop-blur md:flex"
          aria-label={t('Navigasi landing', 'Landing navigation')}
        >
          <Link
            to="/about"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-neutral-100"
          >
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            {t('Tentang', 'About')}
          </Link>
          {nav().map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-4 py-1.5 text-[13.5px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <PreferenceToggles className="hidden gap-1.5 sm:flex" />
          <Button asChild variant="ghost" size="sm" className="hidden rounded-full lg:inline-flex">
            <Link to="/auth">{t('Masuk', 'Sign in')}</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full pl-4 pr-3">
            <Link to="/app">
              <span className="hidden sm:inline">{t('Buka aplikasi', 'Open app')}</span>
              <span className="sm:hidden">{t('Buka', 'Open')}</span> <ArrowUpRight />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t('Tutup menu', 'Close menu') : t('Buka menu', 'Open menu')}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav className="glass mx-auto mt-2 flex max-w-[1360px] animate-fade-up flex-col rounded-[20px] p-2 md:hidden">
          <Link
            to="/about"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold text-ink hover:bg-surface"
          >
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            {t('Tentang SiagaAI', 'About SiagaAI')}
          </Link>
          {nav().map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-[15px] font-semibold text-ink hover:bg-surface"
            >
              {label}
            </a>
          ))}
          <Link to="/auth" className="rounded-xl px-4 py-3 text-[15px] font-semibold text-ink hover:bg-surface">
            {t('Masuk', 'Sign in')}
          </Link>
          <div className="mt-1 flex items-center justify-between border-t border-line px-4 pb-1 pt-3 sm:hidden">
            <span className="text-[13px] font-semibold text-muted">{t('Bahasa & tema', 'Language & theme')}</span>
            <PreferenceToggles className="gap-1.5" />
          </div>
        </nav>
      )}
    </header>
  );
}

function OrbitChip({
  icon,
  value,
  label,
  className,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'glass absolute z-20 flex items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4 [&_svg]:size-[18px]',
        className,
      )}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-surface shadow-soft">{icon}</span>
      <span>
        <span className="display-metric block text-[20px]">{value}</span>
        <span className="mt-0.5 block whitespace-nowrap text-[11.5px] font-medium text-muted">{label}</span>
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface px-5 py-5 sm:px-6">
      <dt className="data-label">{label}</dt>
      <dd className={cn('display-metric mt-2 text-[32px] sm:text-[40px]', accent && 'text-brand')}>
        {value}
      </dd>
      {sub && <dd className="telemetry mt-1.5 normal-case tracking-normal">{sub}</dd>}
    </div>
  );
}

function Bento({
  label,
  title,
  children,
  className,
  to,
  icon,
}: {
  label: string;
  title: string;
  children?: ReactNode;
  className?: string;
  to: string;
  icon?: ReactNode;
}) {
  return (
    <Reveal className={className}>
      <Link
        to={to}
        className="hover-lift group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-[20px] border border-line bg-surface p-6 sm:p-7"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-brand [&_svg]:size-3.5">
            {icon}
            {label}
          </span>
          <ArrowUpRight className="size-4 text-line-strong transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
        </div>
        <p className="text-balance mt-3 max-w-md text-[19px] font-bold leading-snug tracking-[-0.02em]">
          {title}
        </p>
        {children}
      </Link>
    </Reveal>
  );
}

function MiniChecklist() {
  const [done, setDone] = useState<number[]>([0]);
  const items = [
    t('Siapkan masker N95', 'Prepare an N95 mask'),
    t('Isi daya powerbank', 'Charge your power bank'),
    t('Simpan dokumen penting', 'Secure important documents'),
  ];
  return (
    <ul className="mt-5 space-y-1.5">
      {items.map((item, i) => {
        const on = done.includes(i);
        return (
          <li key={item}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDone((d) => (on ? d.filter((x) => x !== i) : [...d, i]));
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left text-[13px] transition-colors hover:bg-raised"
            >
              <span
                className={cn(
                  'grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors',
                  on ? 'border-risk-safe bg-risk-safe text-white' : 'border-line-strong bg-surface',
                )}
              >
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className={cn(on && 'text-subtle line-through')}>{item}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="text-[13.5px] md:col-span-2">
      <p className="data-label mb-3 !text-ink">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-muted transition-colors hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
