import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Binary,
  Bookmark,
  Check,
  Gauge,
  Layers,
  MapPin,
  Megaphone,
  MessageSquareQuote,
  Shuffle,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Ara } from '@/components/common/ara';
import { LogoMark, NusantaraBackdrop } from '@/components/common/brand';
import { Reveal } from '@/components/common/reveal';
import { RiskSpectrum } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { RISK_LEVELS, levelFromScore } from '@/lib/risk-levels';
import { cn } from '@/lib/utils';
import { t, tx } from '@/lib/i18n';
import { FEATURES, MOMENTS } from './data';
import { CONTAINER, Chapter, Heading, Lead } from './parts';
import { useStoryReturn } from './story-return';
import { useDemoLauncher } from './use-demo-launcher';

// ─────────────────────────────────────────────────────────────── SiagaAI arrives

export function ArrivesSection() {
  const shifts: { from: string; fromIcon: LucideIcon; to: string; icon: LucideIcon }[] = [
    { fromIcon: Shuffle, from: t('Terpencar', 'Scattered'), icon: Layers, to: t('Satu layar terpadu', 'One unified screen') },
    { fromIcon: Binary, from: t('Teknis', 'Technical'), icon: Gauge, to: t('Satu skor, bahasa manusia', 'One score, in plain words') },
    { fromIcon: Megaphone, from: t('Generik', 'Generic'), icon: UserRound, to: t('Personal untukmu & keluarga', 'Personal for you & family') },
  ];
  const pipeline = [
    [t('Deteksi', 'Detect'), t('BMKG · NASA · CAMS · GloFAS', 'BMKG · NASA · CAMS · GloFAS')],
    [t('Pahami', 'Understand'), t('Risk Engine → skor 0–100', 'Risk Engine → 0–100 score')],
    [t('Personal', 'Personalize'), t('Pekerjaan · motor · keluarga', 'Job · transport · family')],
    [t('Bertindak', 'Act'), t('Rencana aksi yang dicentang', 'A plan you tick off')],
  ];
  return (
    <section id="siagaai" className="relative overflow-hidden py-24 sm:py-28">
      <NusantaraBackdrop />
      <div className="pointer-events-none absolute left-1/2 top-10 size-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(215_25_32/0.09),transparent_65%)]" aria-hidden />
      <div className={cn(CONTAINER, 'relative text-center')}>
        <Chapter n="06" label={t('Jawabannya', 'The answer')} center />
        <Reveal className="relative mx-auto mt-10 grid size-36 place-items-center">
          {[0, 0.8, 1.6].map((d) => (
            <span
              key={d}
              className="absolute inset-6 animate-pulse-ring rounded-full bg-brand/20"
              style={{ animationDelay: `${d}s` }}
              aria-hidden
            />
          ))}
          <span className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-brand/30" aria-hidden>
            <span className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
          </span>
          <span className="relative grid size-24 place-items-center rounded-[28px] bg-surface shadow-float ring-1 ring-line">
            <LogoMark className="size-16" />
          </span>
        </Reveal>
        <Heading center>
          {t('Lalu,', 'Then,')} <span className="text-brand">{t('SiagaAI hadir.', 'SiagaAI arrives.')}</span>
        </Heading>
        <Lead center>
          {t(
            'Personal Disaster Intelligence — data resmi diterjemahkan menjadi risiko personal & langkah nyata.',
            'Personal Disaster Intelligence — official data translated into personal risk & real action.',
          )}
        </Lead>

        <ul className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
          {shifts.map((s, i) => (
            <Reveal as="li" key={s.to} delay={i * 100} className="panel p-5 text-left">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-subtle line-through decoration-brand/60 decoration-2">
                <s.fromIcon className="size-4 shrink-0" aria-hidden /> {s.from}
              </p>
              <p className="mt-3 flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-risk-safe text-white shadow-soft">
                  <s.icon className="size-4" />
                </span>
                <span className="text-[16.5px] font-bold leading-tight">{s.to}</span>
              </p>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={150} className="mx-auto mt-10 max-w-5xl">
          <ol className="grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-4">
            {pipeline.map(([name, d], i) => (
              <li key={name} className="relative bg-surface px-5 py-4 text-left">
                <span className="font-mono text-[11px] font-semibold text-brand">0{i + 1}</span>
                <p className="mt-1 text-[16px] font-bold">{name}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 rounded-full border border-line bg-surface px-4 py-2 text-[13.5px] font-semibold shadow-soft">
            <span>{t('Algoritma menghitung.', 'The algorithm calculates.')}</span>
            <span className="text-ai">{t('AI menjelaskan.', 'AI explains.')}</span>
            <span className="text-brand">{t('Kamu bertindak.', 'You act.')}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────── Feature previews

function Preview({ id }: { id: string }) {
  if (id === 'score') {
    const score = 84;
    const lv = RISK_LEVELS[levelFromScore(score)];
    return (
      <div>
        <div className="flex items-end gap-3">
          <span className="display-metric text-[56px]">{score}</span>
          <span className="mb-2 text-[16px] font-extrabold uppercase" style={{ color: lv.color }}>
            {lv.label}
          </span>
        </div>
        <RiskSpectrum score={score} className="mt-2" />
      </div>
    );
  }
  if (id === 'map') {
    const dots: [number, number, string][] = [
      [18, 38, '#C62A1F'],
      [32, 62, '#E66B24'],
      [46, 30, '#C62A1F'],
      [58, 58, '#C62A1F'],
      [70, 40, '#D99A22'],
      [82, 66, '#E66B24'],
    ];
    return (
      <div className="relative h-28 overflow-hidden rounded-xl border border-line bg-[#EEF1F4] dark:bg-[#131517]">
        <div className="bg-dots absolute inset-0" />
        {dots.map(([x, y, c], i) => (
          <span key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
            <span className="absolute -inset-2 animate-pulse-ring rounded-full opacity-40" style={{ background: c, animationDelay: `${i * 0.3}s` }} />
            <span className="relative block size-2.5 rounded-full ring-2 ring-surface" style={{ background: c }} />
          </span>
        ))}
        <span className="absolute bottom-2 left-2 rounded-md bg-surface/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
          NASA FIRMS · BMKG
        </span>
      </div>
    );
  }
  if (id === 'personal') {
    const rows = [
      { label: t('Motor · 2 jam di luar', 'Motorbike · 2 h outdoors'), score: 88 },
      { label: t('Mobil · kabin tertutup', 'Car · closed cabin'), score: 66 },
    ];
    return (
      <div className="space-y-3">
        {rows.map((r) => {
          const lv = RISK_LEVELS[levelFromScore(r.score)];
          return (
            <div key={r.label}>
              <div className="flex justify-between text-[12.5px] font-semibold">
                <span>{r.label}</span>
                <span className="tabular" style={{ color: lv.color }}>
                  {r.score} · {lv.label}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-neutral-100">
                <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: lv.color }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  if (id === 'action') {
    const items: [string, boolean][] = [
      [t('Pakai masker N95 saat keluar', 'Wear an N95 mask outside'), true],
      [t('Tutup ventilasi siang hari', 'Close vents at midday'), true],
      [t('Siapkan Tas Siaga', 'Pack the go-bag'), false],
    ];
    return (
      <ul className="space-y-1.5">
        {items.map(([it, done]) => (
          <li key={it} className="flex items-center gap-2.5 text-[13px]">
            <span
              className={cn(
                'grid size-[18px] shrink-0 place-items-center rounded-[5px] border',
                done ? 'border-risk-safe bg-risk-safe text-white' : 'border-line-strong bg-surface',
              )}
            >
              {done && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className={cn(done && 'text-subtle line-through')}>{it}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (id === 'family') {
    const people = [
      { n: 'Ara', r: t('Mahasiswi', 'Student'), p: false },
      { n: 'Nenek Sri', r: t('Lansia', 'Elderly'), p: true },
      { n: 'Adik Rafa', r: t('Anak', 'Child'), p: true },
    ];
    return (
      <ul className="space-y-2">
        {people.map((x) => (
          <li key={x.n} className="flex items-center gap-3">
            <span className={cn('grid size-8 place-items-center rounded-full text-[12px] font-bold', x.p ? 'bg-[var(--risk-high-soft)] text-[var(--risk-high-text)]' : 'bg-neutral-100 text-neutral-700')}>
              {x.n.split(' ').at(-1)!.charAt(0)}
            </span>
            <span className="min-w-0 flex-1 text-[13px]">
              <b className="font-semibold">{x.n}</b> <span className="text-muted">· {x.r}</span>
            </span>
            {x.p && (
              <span className="rounded-full bg-[var(--risk-high-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--risk-high-text)]">
                {t('Prioritas', 'Priority')}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-2 text-[12.5px]">
      <p className="ml-8 rounded-2xl rounded-br-md bg-inverse px-3 py-2 text-on-inverse">
        {t('Aman naik motor jam 7 besok?', 'Safe to ride at 7 tomorrow?')}
      </p>
      <p className="mr-6 rounded-2xl rounded-bl-md border border-ai/15 bg-ai-soft/60 px-3 py-2 text-neutral-700">
        {t('Berangkat 06.30 & pakai N95 — asap paling tipis sebelum 08.00. ✦', 'Leave at 06:30 & wear an N95 — haze is thinnest before 08:00. ✦')}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── 06 · Features

function FeaturePanel({
  index,
  onSelect,
  demo,
}: {
  index: number;
  onSelect: (i: number) => void;
  demo: boolean;
}) {
  const launch = useDemoLauncher();
  const f = FEATURES[index];
  const moment = MOMENTS.find((m) => m.feature === f.id);
  const prev = FEATURES[index - 1];
  const next = FEATURES[index + 1];
  return (
    <div id="feature-panel" role="tabpanel" aria-labelledby={`feature-tab-${f.id}`} className="panel relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-1 transition-colors duration-300" style={{ background: f.color }} aria-hidden />
      <div key={f.id} className="grid animate-fade-up gap-6 p-6 sm:p-8 xl:grid-cols-[1fr_230px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold text-white" style={{ background: f.color }}>
              {f.n} / 0{FEATURES.length}
            </span>
            <span className="rounded-full border border-line bg-raised px-2.5 py-1 text-[12px] font-semibold">{tx(f.tag)}</span>
          </div>
          <h3 className="text-balance mt-4 text-[28px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[34px]">{tx(f.name)}</h3>
          {moment && (
            <div className="mt-4 rounded-2xl border border-brand/15 bg-brand-pale p-4">
              <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-brand-dark">
                <MessageSquareQuote className="size-3.5" /> {t('Menjawab masalah Ara', 'Answers Ara’s problem')} · {moment.time}
              </p>
              <p className="mt-1.5 text-[15px] font-semibold italic">{tx(moment.pain)}</p>
            </div>
          )}
          <p className="mt-5 text-[15.5px] leading-relaxed text-neutral-600">{tx(f.desc)}</p>
          <ul className="mt-4 space-y-2.5">
            {f.points.map((p) => (
              <li key={p.id} className="flex items-start gap-2.5 text-[14.5px] font-medium">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white" style={{ background: f.color }}>
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {tx(p)}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => launch(f, demo)}>
              <f.icon /> {t('Buka', 'Open')} {tx(f.name)} <ArrowUpRight />
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-subtle">
            <Bookmark className="size-3.5" />
            {t('Posisimu di sini tersimpan — kembali dengan satu klik.', 'Your place here is saved — come back in one click.')}
          </p>
        </div>
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-raised p-4">
          <div className="bg-dots absolute inset-0 opacity-60" aria-hidden />
          <p className="telemetry relative">{t('Ilustrasi', 'Illustration')}</p>
          <div className="relative">
            <Preview id={f.id} />
          </div>
          <div className="relative mt-auto flex justify-center pt-2">
            <span className="absolute bottom-0 left-1/2 h-16 w-40 -translate-x-1/2 rounded-full blur-2xl" style={{ background: `${f.color}33` }} aria-hidden />
            <Ara pose={f.pose} size={170} className="relative -mb-5" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-raised px-4 py-3 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => prev && onSelect(index - 1)} disabled={!prev} aria-label={t('Fitur sebelumnya', 'Previous feature')}>
          <ArrowLeft /> <span className="hidden sm:inline">{prev ? tx(prev.name) : t('Sebelumnya', 'Previous')}</span>
        </Button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {FEATURES.map((x, i) => (
            <span
              key={x.id}
              className={cn('h-1.5 rounded-full transition-all duration-300', i === index ? 'w-6' : 'w-1.5 bg-line-strong')}
              style={i === index ? { background: f.color } : undefined}
            />
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => next && onSelect(index + 1)} disabled={!next} aria-label={t('Fitur berikutnya', 'Next feature')}>
          <span className="hidden sm:inline">{next ? tx(next.name) : t('Berikutnya', 'Next')}</span> <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function DemoToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
        on ? 'border-ai/25 bg-ai-soft/60' : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', on ? 'bg-ai text-white' : 'bg-neutral-100 text-muted')}>
        <MapPin className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold leading-tight">{t('Buka sebagai Ara', 'Open as Ara')}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">
          {t('Palangka Raya · data live', 'Palangka Raya · live data')}
        </span>
      </span>
      <span className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', on ? 'bg-ai' : 'bg-line-strong')} aria-hidden>
        <span className={cn('absolute top-1 size-4 rounded-full bg-white shadow-soft transition-[left] duration-200', on ? 'left-5' : 'left-1')} />
      </span>
    </button>
  );
}

export function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const [demo, setDemo] = useState(true);
  const [active, setActive] = useState(() => {
    const r = useStoryReturn.getState().ret;
    return Math.max(0, FEATURES.findIndex((f) => f.id === r?.feature));
  });
  const launch = useDemoLauncher();

  // ← / → step through the features while this section is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = false;
    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const onKey = (e: KeyboardEvent) => {
      if (!inView) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('[role="dialog"]')) return;
      if (e.key === 'ArrowRight') setActive((i) => Math.min(FEATURES.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, i - 1));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      io.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <section ref={ref} id="fitur" className="relative border-y border-line bg-surface py-24 sm:py-28">
      <div className={CONTAINER}>
        <div className="grid items-end gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <Chapter n="07" label={t('Fitur utama', 'Key features')} />
            <Heading>
              {t('6 momen Ara.', '6 moments of Ara.')} <span className="text-brand">{t('6 fitur yang menjawab.', '6 features that answer.')}</span>
            </Heading>
          </div>
          <Lead className="lg:mb-1">
            {t('Pilih fitur, lalu buka langsung di aplikasi.', 'Pick a feature, then open it live in the app.')}
          </Lead>
        </div>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-[320px_1fr] [&>*]:min-w-0">
          <div className="space-y-3 lg:sticky lg:top-24">
            <div role="tablist" aria-label={t('Fitur SiagaAI', 'SiagaAI features')} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {FEATURES.map((f, i) => {
                const on = i === active;
                const m = MOMENTS.find((x) => x.feature === f.id);
                return (
                  <button
                    key={f.id}
                    id={`feature-tab-${f.id}`}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls="feature-panel"
                    onClick={() => setActive(i)}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl border p-2.5 text-left transition-all duration-200',
                      on ? 'border-transparent bg-inverse text-on-inverse shadow-lift' : 'border-line bg-surface hover:border-line-strong hover:bg-raised',
                    )}
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl transition-colors"
                      style={on ? { background: f.color, color: '#fff' } : { background: `${f.color}1a`, color: f.color }}
                    >
                      <f.icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[14px] font-bold leading-tight lg:truncate">{tx(f.name)}</span>
                      <span className={cn('mt-0.5 hidden truncate font-mono text-[10.5px] uppercase tracking-[0.06em] sm:block', on ? 'opacity-60' : 'text-subtle')}>
                        {m?.time} · {tx(f.tag)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <DemoToggle on={demo} onChange={setDemo} />
            <p className="hidden text-center text-[12px] text-subtle lg:block">
              {t('Tips: gunakan ← → untuk berpindah fitur', 'Tip: use ← → to switch features')}
            </p>
          </div>
          <FeaturePanel index={active} onSelect={setActive} demo={demo} />
        </div>

        {/* The loop */}
        <Reveal className="mt-14 text-center">
          <p className="telemetry">{t('Satu alur, dari pagi sampai malam', 'One flow, from morning to night')}</p>
          <ol className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {FEATURES.map((f, i) => (
              <li key={f.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                    i === active ? 'border-transparent text-white shadow-soft' : 'border-line bg-surface hover:border-line-strong',
                  )}
                  style={i === active ? { background: f.color } : undefined}
                >
                  <f.icon className="size-3.5" style={i === active ? undefined : { color: f.color }} />
                  {tx(f.name)}
                </button>
                {i < FEATURES.length - 1 && <ArrowRight className="size-3.5 text-subtle" aria-hidden />}
              </li>
            ))}
          </ol>
          <Button variant="link" className="mt-4" onClick={() => launch(FEATURES[0], demo)}>
            {t('Mulai demo dari awal', 'Start the demo from the top')} <ArrowRight />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

