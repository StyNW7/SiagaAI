import {
  ArrowRight,
  BellOff,
  Binary,
  ChevronDown,
  Globe2,
  Megaphone,
  Quote,
  ShieldAlert,
  Shuffle,
  Smartphone,
  Timer,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { IndonesiaSilhouette } from '@/components/common/brand';
import { Reveal } from '@/components/common/reveal';
import { cn } from '@/lib/utils';
import { locale, t, tx } from '@/lib/i18n';
import { BREAKDOWN, BREAKDOWN_TOTAL } from './data';
import { ALARM, CONTAINER, Chapter, Heading, Lead, Num, SourceChip, scrollToId } from './parts';

const pct = (v: number, d = 1) =>
  ((v / BREAKDOWN_TOTAL) * 100).toLocaleString(locale(), { maximumFractionDigits: d });

// ─────────────────────────────────────────────────────────────── 01 · Hook

export function HookSection() {
  return (
    <section id="fakta" className="relative overflow-hidden pb-24 pt-32 sm:pb-28 sm:pt-40">
      <IndonesiaSilhouette
        className="pointer-events-none absolute left-1/2 top-24 w-[140%] max-w-none -translate-x-1/2 text-ink/[0.035] sm:w-[110%]"
      />
      <div
        className="pointer-events-none absolute -top-48 left-1/2 size-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(215_25_32/0.10),transparent_65%)]"
        aria-hidden
      />

      <div className={cn(CONTAINER, 'relative')}>
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-[13px] font-semibold shadow-soft backdrop-blur">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            {t('Tentang SiagaAI', 'About SiagaAI')}
            <span className="text-muted">· {t('Cerita di baliknya', 'The story behind it')}</span>
          </p>

          <p className="telemetry mt-10 animate-fade-up !text-[13px] [animation-delay:80ms]">
            {t('Sepanjang 2025, di Indonesia', 'Throughout 2025, in Indonesia')}
          </p>
          <h1 className="mt-3 font-extrabold leading-[0.88] tracking-[-0.06em]">
            <span className="block whitespace-nowrap text-[clamp(76px,22vw,200px)]">
              <Num value={3233} duration={2000} />
            </span>
            <span
              className="mt-4 block bg-clip-text pb-2 text-[34px] leading-[1.15] tracking-[-0.04em] text-transparent sm:text-[48px]"
              style={{ backgroundImage: ALARM }}
            >
              {t('kejadian bencana.', 'disaster events.')}
            </span>
          </h1>
          <Reveal
            as="p"
            delay={150}
            className="text-pretty mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted sm:text-[19px]"
          >
            {t('Rata-rata', 'On average')}{' '}
            <b className="font-bold text-ink">{t('±9 bencana setiap hari', '±9 disasters every single day')}</b>
            {t(' — hampir semuanya banjir, cuaca ekstrem & karhutla.', ' — nearly all of them floods, extreme weather & wildfires.')}
          </Reveal>
        </div>

        {/* Composition bar */}
        <Reveal delay={120} className="mx-auto mt-14 max-w-4xl">
          <div
            className="flex h-4 overflow-hidden rounded-full bg-neutral-100"
            role="img"
            aria-label={BREAKDOWN.map((b) => `${tx(b.label)} ${pct(b.value)}%`).join(', ')}
          >
            {BREAKDOWN.map((b) => (
              <div
                key={b.key}
                className="h-full border-r-2 border-canvas last:border-r-0"
                style={{ width: `${(b.value / BREAKDOWN_TOTAL) * 100}%`, background: b.color }}
              />
            ))}
          </div>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px]">
            {BREAKDOWN.map((b) => (
              <li key={b.key} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: b.color }} aria-hidden />
                <span className={b.key === 'other' ? 'text-muted' : 'font-semibold'}>{tx(b.label)}</span>
                <span className="tabular text-muted">{pct(b.value)}%</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Key numbers */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            {
              value: 1623,
              dec: 0,
              unit: t('jiwa', 'lives'),
              label: t('meninggal dunia', 'lost'),
              color: 'var(--color-risk-critical)',
            },
            {
              value: 10.09,
              dec: 2,
              unit: t('juta', 'million'),
              label: t('orang menderita & mengungsi', 'people affected & displaced'),
              color: 'var(--color-risk-high)',
            },
            {
              value: 99,
              dec: 0,
              unit: '%',
              label: t('hidrometeorologi — bisa diprakirakan', 'hydrometeorological — forecastable'),
              color: 'var(--color-hz-flood)',
            },
          ].map((c, i) => (
            <Reveal key={c.label} delay={i * 90} className="panel relative overflow-hidden p-5 text-left">
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.color }} aria-hidden />
              <div className="flex items-baseline gap-1.5">
                <Num value={c.value} decimals={c.dec} className="display-metric text-[40px]" />
                <span className="text-[17px] font-bold text-muted">{c.unit}</span>
              </div>
              <p className="mt-2 text-[13.5px] font-semibold text-neutral-600">{c.label}</p>
            </Reveal>
          ))}
        </div>

        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2 text-[12.5px] text-muted">
          <span>{t('Sumber: BNPB, data kejadian bencana 2025', 'Source: BNPB, 2025 disaster event data')}</span>
          <SourceChip id="bnpb-2025" />
          <SourceChip id="bnpb-2025-type" />
        </div>

        <Reveal className="mx-auto mt-20 max-w-3xl text-center">
          <p className="text-balance text-[24px] font-bold leading-snug tracking-[-0.025em] text-muted sm:text-[30px]">
            {t('Bencananya bisa diprakirakan. Peringatannya pun ada.', 'They can be forecast. The warnings exist.')}
          </p>
          <p className="text-balance mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[40px]">
            {t('Lalu, kenapa warga tetap terlambat bertindak?', 'So why do people still act too late?')}
          </p>
          <button
            type="button"
            onClick={() => scrollToId('masalah')}
            className="group mt-8 inline-flex flex-col items-center gap-2 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
          >
            {t('Cari tahu', 'Find out')}
            <span className="grid size-11 place-items-center rounded-full border border-line bg-surface shadow-soft transition-shadow group-hover:shadow-lift">
              <ChevronDown className="size-5 animate-float" />
            </span>
          </button>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────── 02 · Problem

export function ProblemSection() {
  const causes: { icon: LucideIcon; title: string; body: string; sample?: string; symptom: string }[] = [
    {
      icon: Shuffle,
      title: t('Terpencar', 'Scattered'),
      body: t('BMKG, NASA, BNPB, Copernicus — beda portal, beda format.', 'BMKG, NASA, BNPB, Copernicus — different portals, different formats.'),
      symptom: t('“Cek di mana dulu, ya?”', '“Where do I even check?”'),
    },
    {
      icon: Binary,
      title: t('Teknis', 'Technical'),
      body: t('Angka mentah tanpa makna bagi warga.', 'Raw numbers that mean nothing to people.'),
      sample: t('PM2.5 182 µg/m³ · 24 titik panas', 'PM2.5 182 µg/m³ · 24 hotspots'),
      symptom: t('“Itu bahaya atau nggak?”', '“Is that dangerous or not?”'),
    },
    {
      icon: Megaphone,
      title: t('Generik', 'Generic'),
      body: t('Satu peringatan per provinsi — sama untuk semua orang.', 'One warning per province — the same for everyone.'),
      symptom: t('“Terus aku harus ngapain?”', '“So what should I do?”'),
    },
  ];
  return (
    <section id="masalah" className="relative border-y border-line bg-surface py-24 sm:py-28">
      <div className={CONTAINER}>
        <Chapter n="02" label={t('Masalahnya', 'The problem')} center />
        <Heading center className="max-w-4xl">
          {t('Bukan kurang data.', 'It isn’t a lack of data.')}{' '}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: ALARM }}>
            {t('Datanya tidak bicara pada warga.', 'The data doesn’t speak to people.')}
          </span>
        </Heading>

        <ol className="mt-14 grid gap-4 md:grid-cols-3">
          {causes.map((c, i) => (
            <Reveal as="li" key={c.title} delay={i * 100} className="panel flex flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <c.icon className="size-5" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                  {t('Akar', 'Cause')} 0{i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-[21px] font-bold">{c.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{c.body}</p>
              {c.sample && (
                <p className="mt-3 w-fit rounded-lg bg-neutral-100 px-2.5 py-1.5 font-mono text-[11.5px] text-neutral-600">
                  {c.sample}
                </p>
              )}
              <p className="mt-auto flex items-start gap-2 border-t border-dashed border-line pt-4 text-[14px] font-medium italic text-neutral-700">
                <Quote className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                {c.symptom}
              </p>
            </Reveal>
          ))}
        </ol>

        {/* Three causes converge into one outcome */}
        <svg className="mx-auto hidden h-16 w-full md:block" viewBox="0 0 600 64" preserveAspectRatio="none" aria-hidden>
          {[100, 300, 500].map((x) => (
            <path
              key={x}
              d={`M ${x} 0 C ${x} 36, 300 28, 300 64`}
              fill="none"
              stroke="var(--color-brand)"
              strokeOpacity={0.45}
              strokeWidth={1.5}
              strokeDasharray="4 5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="flex justify-center md:hidden" aria-hidden>
          <span className="my-3 h-10 border-l-2 border-dashed border-brand/40" />
        </div>

        <Reveal className="relative mx-auto max-w-2xl overflow-hidden rounded-[26px] bg-night p-7 text-center text-white shadow-float sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand/40 blur-3xl" aria-hidden />
          <span className="relative mx-auto grid size-12 place-items-center rounded-2xl bg-white/10">
            <BellOff className="size-6 text-red-300" />
          </span>
          <p className="relative mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
            {t('Hasilnya', 'The result')}
          </p>
          <p className="text-balance relative mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]">
            {t('Peringatan dini ada. Tindakan dini tidak terjadi.', 'Early warning exists. Early action doesn’t happen.')}
          </p>
          <button
            type="button"
            onClick={() => scrollToId('riset')}
            className="relative mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white/70 transition-colors hover:text-white"
          >
            {t('Lihat apa kata data', 'See what the data says')} <ArrowRight className="size-4" />
          </button>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────── 03 · Research

interface Finding {
  icon: LucideIcon;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  claim: string;
  why: string;
  source: string;
  tone: string;
}

function FindingCard({ f, delay }: { f: Finding; delay: number }) {
  return (
    <Reveal as="article" delay={delay} className="panel hover-lift flex flex-col p-6">
      <span className="grid size-10 place-items-center rounded-xl" style={{ background: `${f.tone}1a`, color: f.tone }}>
        <f.icon className="size-[18px]" />
      </span>
      <div className="mt-5 text-[44px] font-extrabold leading-none tracking-[-0.045em]">
        <Num value={f.value} decimals={f.decimals ?? 0} prefix={f.prefix} />
        <span className="text-[0.55em]">{f.suffix}</span>
      </div>
      <p className="mt-3 text-[15px] font-semibold leading-snug">{f.claim}</p>
      <p className="mt-2 flex gap-1.5 text-[13.5px] leading-relaxed text-muted">
        <ArrowRight className="mt-[3px] size-3.5 shrink-0 text-brand" aria-hidden />
        {f.why}
      </p>
      <div className="mt-auto pt-5">
        <SourceChip id={f.source} />
      </div>
    </Reveal>
  );
}

export function ResearchSection() {
  const findings: Finding[] = [
    {
      icon: Timer,
      value: 30,
      suffix: '%',
      claim: t('kerugian bisa dipangkas dengan peringatan 24 jam lebih awal.', 'of damage can be cut with just 24 hours of warning.'),
      why: t('Setiap jam lebih awal = lebih banyak yang terselamatkan.', 'Every hour earlier = more saved.'),
      source: 'gca-2019',
      tone: '#208a61',
    },
    {
      icon: Globe2,
      value: 3,
      prefix: '#',
      claim: t('Indonesia — negara paling berisiko bencana ke-3 di dunia.', 'Indonesia — the 3rd most disaster-prone country on Earth.'),
      why: t('Risiko tinggi menuntut kesiapsiagaan setiap warga.', 'High risk demands every citizen be prepared.'),
      source: 'wrr-2025',
      tone: '#d71920',
    },
    {
      icon: Wind,
      value: 919516,
      claim: t('warga terserang ISPA akibat asap karhutla 2019.', 'people got respiratory infections from 2019 wildfire haze.'),
      why: t('1,65 juta ha terbakar — asapnya menjangkau jutaan rumah.', '1.65 million ha burned — the haze reached millions of homes.'),
      source: 'bnpb-ispa-2019',
      tone: '#e66b24',
    },
    {
      icon: Smartphone,
      value: 80.66,
      decimals: 2,
      suffix: '%',
      claim: t('warga Indonesia sudah online — 229 juta orang.', 'of Indonesians are online — 229 million people.'),
      why: t('Peringatan personal kini bisa sampai ke saku warga.', 'Personal warnings can now reach every pocket.'),
      source: 'apjii-2025',
      tone: '#4e54d8',
    },
  ];

  return (
    <section id="riset" className="relative py-24 sm:py-28">
      <div className={CONTAINER}>
        <div className="grid items-end gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Chapter n="03" label={t('Riset & data', 'Research & data')} />
            <Heading>{t('Data membuktikan: celah ini nyata — dan mematikan.', 'The data agrees: this gap is real — and deadly.')}</Heading>
          </div>
          <Lead className="lg:mb-1">
            {t('Bukan asumsi. Lima temuan dari lembaga resmi & riset global.', 'Not an assumption. Five findings from official agencies & global research.')}
          </Lead>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {/* Lead finding: ~6× mortality */}
          <Reveal
            as="article"
            className="relative flex flex-col overflow-hidden rounded-[20px] bg-night p-6 text-white shadow-float sm:p-7 md:col-span-2 lg:col-span-1 lg:row-span-2"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand/45 blur-3xl" aria-hidden />
            <span className="relative grid size-10 place-items-center rounded-xl bg-white/10 text-red-300">
              <ShieldAlert className="size-[18px]" />
            </span>
            <div className="relative mt-5 text-[72px] font-extrabold leading-none tracking-[-0.05em] sm:text-[84px]">
              ≈<Num value={6} />
              <span className="text-[0.5em]">×</span>
            </div>
            <p className="relative mt-3 text-[16px] font-semibold leading-snug">
              {t(
                'lebih tinggi angka kematian bencana di negara dengan peringatan dini terbatas.',
                'higher disaster mortality in countries with limited early warning.',
              )}
            </p>
            <div className="relative mt-7 space-y-3" role="img" aria-label={t('Perbandingan 1 banding 6', 'Comparison 1 to 6')}>
              {[
                { label: t('Peringatan dini menyeluruh', 'Comprehensive early warning'), w: 16, c: 'bg-risk-safe' },
                { label: t('Peringatan dini terbatas', 'Limited early warning'), w: 96, c: 'bg-brand' },
              ].map((b) => (
                <div key={b.label}>
                  <p className="text-[12px] font-semibold text-white/60">{b.label}</p>
                  <div className="mt-1.5 h-3 rounded-full bg-white/10">
                    <div className={cn('h-full rounded-full', b.c)} style={{ width: `${b.w}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="relative mt-6 flex gap-1.5 text-[13.5px] leading-relaxed text-white/65">
              <ArrowRight className="mt-[3px] size-3.5 shrink-0 text-red-300" aria-hidden />
              {t('Peringatan yang dipahami & ditindaklanjuti menyelamatkan nyawa.', 'Warnings that are understood & acted on save lives.')}
            </p>
            <div className="relative mt-auto pt-6">
              <SourceChip id="mhews-2025" light />
            </div>
          </Reveal>
          {findings.map((f, i) => (
            <FindingCard key={f.source} f={f} delay={80 + i * 70} />
          ))}
        </div>

        <Reveal className="relative mt-6 overflow-hidden rounded-[24px] border border-brand/15 bg-brand-pale p-6 sm:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="telemetry !text-brand">{t('Benang merahnya', 'The common thread')}</p>
              <p className="text-balance mt-2 text-[22px] font-bold leading-snug tracking-[-0.02em] sm:text-[26px]">
                {t('Yang hilang bukan data — melainkan', 'What’s missing isn’t data — it’s')}{' '}
                <span className="text-brand">{t('penerjemah', 'a translator')}</span>{' '}
                {t('dari sinyal teknis menjadi tindakan personal.', 'from technical signals to personal action.')}
              </p>
            </div>
            <figure className="rounded-2xl border border-line bg-surface p-5">
              <blockquote className="flex gap-2 text-[14px] font-medium leading-relaxed">
                <Quote className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {t(
                  'Target PBB: setiap orang di Bumi terlindungi peringatan dini pada akhir 2027.',
                  'UN target: everyone on Earth protected by early warnings by the end of 2027.',
                )}
              </blockquote>
              <figcaption className="mt-3 flex items-center justify-between gap-2 text-[12.5px] text-muted">
                <span>Early Warnings for All</span>
                <SourceChip id="ew4all" />
              </figcaption>
            </figure>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
