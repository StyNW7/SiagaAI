import { ChevronDown, CircleAlert, Frown, HeartHandshake, MapPin, Quote, Target, type LucideIcon } from 'lucide-react';
import { Ara } from '@/components/common/ara';
import { NusantaraBackdrop } from '@/components/common/brand';
import { Reveal } from '@/components/common/reveal';
import { cn } from '@/lib/utils';
import { t, tx } from '@/lib/i18n';
import { MOMENTS } from './data';
import { CONTAINER, Chapter, Heading, Lead, scrollToId } from './parts';

// ─────────────────────────────────────────────────────────────── 04 · Persona

function PersonaCard() {
  const blocks: { icon: LucideIcon; title: string; tone: string; items: string[] }[] = [
    {
      icon: Target,
      title: t('Harapan', 'Hopes'),
      tone: 'bg-[var(--risk-safe-soft)] text-[var(--risk-safe-text)]',
      items: [
        t('Kuliah tanpa terganggu asap', 'Study without the haze getting in the way'),
        t('Nenek & adik tetap sehat', 'Grandma & brother stay healthy'),
        t('Tahu kapan harus waspada', 'Know when to be on alert'),
      ],
    },
    {
      icon: Frown,
      title: t('Frustrasi', 'Frustrations'),
      tone: 'bg-brand-soft text-brand-dark',
      items: [
        t('Info tersebar di banyak tempat', 'Information spread everywhere'),
        t('Angka teknis yang membingungkan', 'Confusing technical numbers'),
        t('Peringatan tak menyebut dirinya', 'Warnings never mention her'),
      ],
    },
    {
      icon: HeartHandshake,
      title: t('Yang ia butuhkan', 'What she needs'),
      tone: 'bg-ai-soft text-ai-deep',
      items: [
        t('Satu jawaban yang jelas', 'One clear answer'),
        t('Risiko untuk dirinya', 'Risk for her, personally'),
        t('Langkah yang bisa dilakukan', 'Steps she can take'),
      ],
    },
  ];
  return (
    <Reveal className="panel mt-12 grid overflow-hidden lg:grid-cols-[1fr_1.55fr]">
      <div className="relative overflow-hidden border-b border-line bg-brand-pale p-6 sm:p-8 lg:border-b-0 lg:border-r">
        <NusantaraBackdrop topo={false} />
        <div className="relative flex items-end gap-4">
          <Ara pose="thinking" size={150} className="-mb-2 -ml-2" alt={t('Ara, persona SiagaAI', 'Ara, the SiagaAI persona')} />
          <div className="min-w-0 pb-3">
            <p className="data-label">User persona</p>
            <p className="text-[30px] font-extrabold leading-none tracking-[-0.04em]">Ara</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] text-muted">
              <MapPin className="size-3.5 shrink-0" /> Palangka Raya, Kalteng
            </p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-1.5">
          {[
            t('21 tahun', '21 years old'),
            t('Mahasiswi', 'University student'),
            t('Naik motor ke kampus', 'Rides a motorbike'),
            t('Tinggal dgn Nenek & Adik', 'Lives with Grandma & brother'),
          ].map((x) => (
            <span key={x} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold">
              {x}
            </span>
          ))}
        </div>
        <blockquote className="text-balance relative mt-6 text-[21px] font-bold leading-snug tracking-[-0.02em] sm:text-[23px]">
          <Quote className="mb-2 size-6 text-brand" aria-hidden />
          {t(
            '“Peringatannya ada. Tapi aku nggak tahu artinya buat aku.”',
            '“The warnings are there. I just don’t know what they mean for me.”',
          )}
        </blockquote>
      </div>
      <div className="grid gap-px bg-line sm:grid-cols-3">
        {blocks.map((b) => (
          <div key={b.title} className="bg-surface p-6">
            <span className={cn('grid size-10 place-items-center rounded-xl', b.tone)}>
              <b.icon className="size-[18px]" />
            </span>
            <h3 className="mt-4 text-[16px] font-bold">{b.title}</h3>
            <ul className="mt-3 space-y-2.5">
              {b.items.map((it) => (
                <li key={it} className="flex gap-2 text-[14px] leading-snug text-muted">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(pts: [number, number][]) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const W = 1200;
const H = 180;
const STEP = W / MOMENTS.length;
const POINTS: [number, number][] = MOMENTS.map((m, i) => [STEP / 2 + i * STEP, 22 + ((100 - m.calm) / 100) * (H - 44)]);
const MOOD = ['#3478c6', '#6f63b5', '#d99a22', '#e66b24', '#d71920', '#a51e22'];

function CalmCurve() {
  const line = smooth(POINTS);
  const area = `${line} L ${POINTS.at(-1)![0]} ${H} L ${POINTS[0][0]} ${H} Z`;
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[180px] w-full overflow-visible"
        role="img"
        aria-label={t('Rasa tenang Ara turun sepanjang hari', 'Ara’s sense of calm drops throughout the day')}
      >
        <defs>
          <linearGradient id="calm-line" x1="0" x2="1" y1="0" y2="0">
            {MOOD.map((c, i) => (
              <stop key={c} offset={i / (MOOD.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
          <linearGradient id="calm-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#d71920" stopOpacity="0.12" />
            <stop offset="1" stopColor="#d71920" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="var(--color-line)"
            strokeDasharray="4 6"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill="url(#calm-area)" />
        <path d={line} fill="none" stroke="url(#calm-line)" strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {POINTS.map(([x, y], i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
        >
          <span className="block size-4 rounded-full border-[3px] border-surface shadow-lift" style={{ background: MOOD[i] }} />
          <span
            className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-white shadow-soft"
            style={{ background: MOOD[i] }}
          >
            {MOMENTS[i].time}
          </span>
        </div>
      ))}
      <div className="pointer-events-none absolute inset-y-0 -left-1 hidden flex-col justify-between py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-subtle min-[1400px]:flex min-[1400px]:-translate-x-full" aria-hidden>
        <span>{t('Tenang', 'Calm')}</span>
        <span>{t('Cemas', 'Anxious')}</span>
      </div>
    </div>
  );
}

export function PersonaSection() {
  return (
    <section id="ara" className="relative border-y border-line bg-surface py-24 sm:py-28">
      <div className={CONTAINER}>
        <div className="grid items-end gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Chapter n="04" label={t('Kenalkan, Ara', 'Meet Ara')} />
            <Heading>{t('Satu wajah dari 10 juta warga terdampak.', 'One face of 10 million affected people.')}</Heading>
          </div>
          <Lead className="lg:mb-1">
            {t('Persona representatif yang disusun dari data di atas.', 'A representative persona built from the data above.')}
          </Lead>
        </div>

        <PersonaCard />

        <div className="mt-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-dark">
                {t('Sebelum SiagaAI', 'Before SiagaAI')}
              </span>
              <h3 className="text-balance mt-3 text-[26px] font-extrabold tracking-[-0.03em] sm:text-[32px]">
                {t('Satu hari Ara di musim asap.', 'One day of Ara in the haze season.')}
              </h3>
            </div>
            <span className="flex items-center gap-2 text-[13px] text-muted">
              <span className="h-1 w-8 rounded-full" style={{ background: `linear-gradient(90deg, ${MOOD.join(',')})` }} aria-hidden />
              {t('Rasa tenang Ara', 'Ara’s sense of calm')}
            </span>
          </div>

          <Reveal className="mt-14 hidden lg:block">
            <CalmCurve />
          </Reveal>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {MOMENTS.map((m, i) => (
              <Reveal as="li" key={m.time} delay={i * 70} className="panel flex flex-col p-4">
                <span className="font-mono text-[11.5px] font-semibold" style={{ color: MOOD[i] }}>
                  {m.time}
                </span>
                <h4 className="mt-2 text-[15px] font-bold leading-snug">{tx(m.title)}</h4>
                <p className="mt-1.5 text-[13px] italic leading-snug text-muted">{tx(m.pain)}</p>
                <div className="mt-auto pt-4">
                  <p className="flex items-start gap-1.5 rounded-lg bg-brand-pale px-2.5 py-2 text-[11.5px] font-semibold leading-snug text-brand-dark ring-1 ring-inset ring-brand/10">
                    <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                    <span>
                      {t('Hilang:', 'Missing:')} {tx(m.missing)}
                    </span>
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────── 05 · The question

export function QuestionSection() {
  const qs = [
    t('Apakah aku terdampak?', 'Am I affected?'),
    t('Seberapa besar risikonya — untukku & keluargaku?', 'How big is the risk — for me & my family?'),
    t('Apa yang harus kulakukan sekarang?', 'What should I do right now?'),
  ];
  return (
    <section id="pertanyaan" className="relative overflow-hidden bg-night py-24 text-white sm:py-32">
      <NusantaraBackdrop variant="dark" />
      <div className="pointer-events-none absolute -left-40 top-1/3 size-[520px] rounded-full bg-brand/25 blur-[120px]" aria-hidden />
      <div className={cn(CONTAINER, 'relative grid items-center gap-12 lg:grid-cols-[1.4fr_1fr]')}>
        <div>
          <Chapter n="05" label={t('Pertanyaannya', 'The question')} light />
          <Reveal
            as="h2"
            className="text-balance mt-5 text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-[46px]"
          >
            {t('Bagaimana jika setiap warga punya', 'What if every citizen had a')}{' '}
            <span className="text-red-300">{t('penerjemah risiko pribadi', 'personal risk translator')}</span>{' '}
            {t('yang menjawab:', 'that answers:')}
          </Reveal>
          <ol className="mt-10 space-y-3">
            {qs.map((q, i) => (
              <Reveal
                as="li"
                key={q}
                delay={i * 120}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4"
              >
                <span className="tabular grid size-9 shrink-0 place-items-center rounded-full bg-brand font-mono text-[13px] font-semibold">
                  {i + 1}
                </span>
                <span className="text-[18px] font-bold tracking-[-0.015em] sm:text-[21px]">{q}</span>
              </Reveal>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => scrollToId('siagaai')}
            className="group mt-10 inline-flex items-center gap-3 text-[14px] font-semibold text-white/70 transition-colors hover:text-white"
          >
            <span className="grid size-11 place-items-center rounded-full border border-white/15 transition-colors group-hover:border-white/35">
              <ChevronDown className="size-5 animate-float" />
            </span>
            {t('Jawabannya', 'The answer')}
          </button>
        </div>
        <Reveal delay={150} className="relative mx-auto flex aspect-square w-full max-w-[380px] items-center justify-center">
          <div className="absolute inset-[6%] rounded-full border border-dashed border-white/15" aria-hidden />
          <div className="absolute inset-[22%] animate-spin-slow rounded-full border border-dashed border-red-300/30" aria-hidden>
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-red-300" />
          </div>
          <div className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle,rgb(240_53_61/0.3),transparent_70%)]" aria-hidden />
          <Ara pose="hero-explain" size={340} className="relative !h-[86%] !w-auto" float />
          <span className="absolute right-0 top-[8%] animate-[float_6s_ease-in-out_infinite] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[13.5px] font-bold text-[#171717] shadow-float">
            {t('Terus, aku harus apa?', 'So… what do I do?')}
          </span>
        </Reveal>
      </div>
    </section>
  );
}
