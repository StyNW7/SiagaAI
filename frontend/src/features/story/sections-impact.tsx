import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  Building2,
  Check,
  CloudOff,
  Database,
  ExternalLink,
  HeartPulse,
  House,
  Languages,
  Layers,
  ListChecks,
  LocateFixed,
  Lock,
  PlayCircle,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { Ara, type AraPose } from '@/components/common/ara';
import { IndonesiaSilhouette, NusantaraBackdrop } from '@/components/common/brand';
import { Reveal } from '@/components/common/reveal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t, tx } from '@/lib/i18n';
import { FEATURES, SOURCES } from './data';
import { CONTAINER, Chapter, Heading, Lead } from './parts';
import { useDemoLauncher } from './use-demo-launcher';

// ─────────────────────────────────────────────────────────────── 08 · Impact

export function ImpactSection() {
  const chain: { tag: string; icon: LucideIcon; title: string; body: string }[] = [
    {
      tag: t('Aktivitas', 'Activity'),
      icon: LocateFixed,
      title: t('Warga cek risiko personal', 'People check personal risk'),
      body: t('Satu klik, tanpa login.', 'One click, no login.'),
    },
    {
      tag: 'Output',
      icon: Layers,
      title: t('Paham artinya bagi dirinya', 'They understand what it means'),
      body: t('Skor, dampak & bahasa sehari-hari.', 'Score, impact & plain language.'),
    },
    {
      tag: 'Outcome',
      icon: ListChecks,
      title: t('Bertindak lebih awal', 'They act earlier'),
      body: t('Rencana aksi untuk diri & keluarga.', 'A plan for self & family.'),
    },
    {
      tag: t('Dampak', 'Impact'),
      icon: HeartPulse,
      title: t('Korban & kerugian berkurang', 'Fewer casualties & losses'),
      body: t('Peringatan dini → tindakan dini.', 'Early warning → early action.'),
    },
  ];
  const facts: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: Layers, value: '4', label: t('bahaya dalam satu skor', 'hazards in one score') },
    { icon: Database, value: '7', label: t('sumber data resmi & terbuka', 'official & open data sources') },
    { icon: ListChecks, value: '3', label: t('fase rencana aksi', 'action plan phases') },
    { icon: Lock, value: '0', label: t('login untuk fitur inti', 'logins for core features') },
    { icon: CloudOff, value: 'PWA', label: t('tetap jalan saat offline', 'keeps working offline') },
    { icon: Languages, value: '2', label: t('bahasa: Indonesia & Inggris', 'languages: Indonesian & English') },
  ];
  const who: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: Users, title: t('Warga', 'Citizens'), body: t('Tahu risiko & langkahnya, setiap hari.', 'Know the risk & the steps, every day.') },
    { icon: House, title: t('Keluarga', 'Families'), body: t('Anak & lansia terlindungi lebih dulu.', 'Kids & elderly protected first.') },
    { icon: BellRing, title: t('Komunitas', 'Communities'), body: t('Sinyal lapangan yang jujur dilabeli.', 'Ground signals, honestly labelled.') },
    { icon: Building2, title: t('BPBD & institusi', 'Agencies & institutions'), body: t('Fondasi pendukung keputusan.', 'A decision-support foundation.') },
  ];

  return (
    <section id="dampak" className="relative py-24 sm:py-28">
      <div className={CONTAINER}>
        <Chapter n="08" label={t('Dampak', 'Impact')} center tone="calm" />
        <Heading center className="max-w-4xl">
          {t('Dari peringatan dini,', 'From early warning,')}{' '}
          <span className="text-risk-safe">{t('menjadi tindakan dini.', 'to early action.')}</span>
        </Heading>
        <Lead center>{t('Bagaimana SiagaAI menciptakan perubahan.', 'How SiagaAI creates change.')}</Lead>

        <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {chain.map((c, i) => {
            const last = i === chain.length - 1;
            return (
              <Reveal as="li" key={c.title} delay={i * 100} className="relative">
                <div className={cn('panel h-full p-5', last && 'border-risk-safe/30 bg-[var(--risk-safe-soft)]')}>
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'grid size-10 place-items-center rounded-xl',
                        last ? 'bg-risk-safe text-white' : 'bg-[var(--risk-safe-soft)] text-[var(--risk-safe-text)]',
                      )}
                    >
                      <c.icon className="size-[18px]" />
                    </span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-subtle">{c.tag}</span>
                  </div>
                  <h3 className="mt-4 text-[17px] font-bold leading-snug">{c.title}</h3>
                  <p className="mt-1.5 text-[13.5px] text-muted">{c.body}</p>
                </div>
                {!last && (
                  <span
                    className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-risk-safe lg:grid"
                    aria-hidden
                  >
                    <ArrowRight className="size-3.5" />
                  </span>
                )}
              </Reveal>
            );
          })}
        </ol>

        <div className="mt-16 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="telemetry">{t('Sudah berjalan hari ini', 'Already working today')}</p>
            <h3 className="mt-1 text-[24px] font-extrabold tracking-[-0.03em] sm:text-[28px]">
              {t('Bukan janji — bisa dicek di demo', 'Not a promise — check it in the demo')}
            </h3>
          </div>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line md:grid-cols-3 lg:grid-cols-6">
          {facts.map((k, i) => (
            <Reveal as="li" key={k.label} delay={i * 60} className="flex flex-col bg-surface p-5">
              <k.icon className="size-5 text-brand" aria-hidden />
              <span className="display-metric mt-4 text-[34px]">{k.value}</span>
              <span className="mt-2 text-[13px] font-medium leading-snug text-neutral-600">{k.label}</span>
            </Reveal>
          ))}
        </ul>

        <p className="telemetry mt-14 text-center">{t('Siapa yang merasakan dampaknya', 'Who feels the impact')}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {who.map((w, i) => (
            <Reveal as="li" key={w.title} delay={i * 70} className="rounded-2xl border border-line bg-surface p-5">
              <w.icon className="size-5 text-risk-safe" aria-hidden />
              <h3 className="mt-3 text-[16px] font-bold">{w.title}</h3>
              <p className="mt-1 text-[13.5px] text-muted">{w.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────── 09 · SDGs

export function SdgSection() {
  const sdg13 = [
    {
      code: '13.1',
      text: t('Memperkuat ketahanan & kapasitas adaptasi terhadap bencana iklim.', 'Strengthen resilience & adaptive capacity to climate disasters.'),
    },
    {
      code: '13.3',
      text: t('Edukasi & kesadaran warga lewat peringatan dini yang dipahami.', 'Education & awareness through early warnings people understand.'),
    },
    {
      code: 'Sendai',
      text: t(
        'Kerangka Sendai Prioritas 1 & 4 — memahami risiko & siap merespons; sejalan dengan Early Warnings for All.',
        'Sendai Framework Priorities 1 & 4 — understand risk & be ready to respond; in line with Early Warnings for All.',
      ),
    },
  ];
  const others = [
    { n: '11', color: '#FD9D24', target: '11.5', name: t('Kota & permukiman berkelanjutan', 'Sustainable cities & communities'), text: t('Mengurangi korban & warga terdampak bencana.', 'Reduce deaths & people affected by disasters.') },
    { n: '3', color: '#4C9F38', target: '3.9 · 3.d', name: t('Kehidupan sehat & sejahtera', 'Good health & well-being'), text: t('Kurangi paparan asap; peringatan dini risiko kesehatan.', 'Cut smoke exposure; early warning of health risks.') },
    { n: '15', color: '#56C02B', target: '15.1', name: t('Ekosistem daratan', 'Life on land'), text: t('Pemantauan & pelaporan dini titik panas karhutla.', 'Early hotspot monitoring & reporting.') },
  ];
  return (
    <section id="sdgs" className="relative overflow-hidden border-y border-line bg-surface py-24 sm:py-28">
      <div className={CONTAINER}>
        <div className="grid items-end gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <Chapter n="09" label={t('Kontribusi SDGs', 'SDG contribution')} tone="calm" />
            <Heading>{t('Dibangun untuk SDG 13 — berdampak lebih luas.', 'Built for SDG 13 — with wider ripples.')}</Heading>
          </div>
          <Lead className="lg:mb-1">{t('Mitigasi bencana & perubahan iklim, dari warga untuk warga.', 'Disaster & climate mitigation, by citizens for citizens.')}</Lead>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Reveal className="panel overflow-hidden">
            <div className="flex items-center gap-4 p-6 text-white sm:p-7" style={{ background: '#3F7E44' }}>
              <span className="text-[60px] font-extrabold leading-none tracking-[-0.04em]">13</span>
              <div>
                <p className="text-[19px] font-extrabold uppercase leading-tight tracking-wide">{t('Penanganan perubahan iklim', 'Climate action')}</p>
                <p className="text-[13px] text-white/80">{t('Tujuan utama · Mitigasi Bencana & Perubahan Iklim', 'Primary goal · Disaster & Climate Mitigation')}</p>
              </div>
              <ShieldCheck className="ml-auto hidden size-12 opacity-90 sm:block" strokeWidth={1.6} aria-hidden />
            </div>
            <ul className="divide-y divide-line">
              {sdg13.map((x) => (
                <li key={x.code} className="flex items-start gap-4 p-5 sm:px-7">
                  <span className="tabular flex h-9 w-16 shrink-0 items-center justify-center rounded-lg font-mono text-[12.5px] font-semibold text-white" style={{ background: '#3F7E44' }}>
                    {x.code}
                  </span>
                  <p className="text-[14.5px] leading-relaxed">{x.text}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="grid gap-4">
            {others.map((o, i) => (
              <Reveal key={o.n} delay={i * 90} className="panel flex gap-4 p-5">
                <span className="grid size-14 shrink-0 place-items-center rounded-xl text-[24px] font-extrabold text-white" style={{ background: o.color }}>
                  {o.n}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-subtle">
                    SDG {o.n} · {t('Target', 'Target')} {o.target}
                  </p>
                  <h3 className="mt-0.5 text-[16px] font-bold leading-snug">{o.name}</h3>
                  <p className="mt-1 text-[13.5px] text-muted">{o.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────── 10 · Closing

const GALLERY: AraPose[] = ['wave', 'success', 'checklist', 'kit', 'family', 'radio', 'map', 'rest'];

export function ClosingSection() {
  const launch = useDemoLauncher();
  const before = [
    t('Menebak aman atau tidak', 'Guessing whether it’s safe'),
    t('Info simpang siur di banyak tempat', 'Mixed messages everywhere'),
    t('Angka teknis tanpa makna', 'Technical numbers, no meaning'),
    t('Tak tahu harus berbuat apa', 'No idea what to do'),
    t('Keluarga tanpa rencana', 'A family with no plan'),
  ];
  const after = [
    t('Satu skor jelas setiap pagi', 'One clear score every morning'),
    t('Satu peta, data resmi berlabel', 'One map, labelled official data'),
    t('Risiko personal untuk motornya', 'Personal risk for her motorbike ride'),
    t('Rencana aksi tinggal dicentang', 'An action plan to tick off'),
    t('Nenek & adik jadi prioritas', 'Grandma & brother come first'),
  ];
  return (
    <section id="penutup" className="relative overflow-hidden pb-10 pt-24 sm:pt-28">
      <div className={CONTAINER}>
        <Chapter n="10" label={t('Penutup', 'Closing')} center />
        <Heading center className="max-w-3xl">
          {t('Ara, bersama SiagaAI:', 'Ara, with SiagaAI:')} <span className="text-brand">{t('tak lagi menebak.', 'no more guessing.')}</span>
        </Heading>

        <div className="mx-auto mt-12 grid max-w-5xl items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <Reveal className="rounded-[24px] border border-line bg-surface p-6 sm:p-7">
            <p className="telemetry">{t('Sebelum', 'Before')}</p>
            <ul className="mt-5 space-y-3">
              {before.map((b) => (
                <li key={b} className="flex gap-3 text-[14.5px] text-muted">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                    <X className="size-3" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="flex items-center justify-center" aria-hidden>
            <span className="grid size-12 rotate-90 place-items-center rounded-full bg-brand text-white shadow-lift md:rotate-0">
              <ArrowRight className="size-5" />
            </span>
          </div>
          <Reveal delay={100} className="relative overflow-hidden rounded-[24px] border border-risk-safe/25 bg-[var(--risk-safe-soft)] p-6 sm:p-7">
            <p className="telemetry !text-[var(--risk-safe-text)]">{t('Bersama SiagaAI', 'With SiagaAI')}</p>
            <ul className="mt-5 space-y-3">
              {after.map((a) => (
                <li key={a} className="flex gap-3 text-[14.5px] font-medium">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-risk-safe text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {a}
                </li>
              ))}
            </ul>
            <Ara pose="success" size={110} className="absolute -bottom-3 right-3 hidden sm:block" />
          </Reveal>
        </div>
      </div>

      {/* Conclusion card with the Ara gallery */}
      <div className="px-4 sm:px-8">
        <Reveal className="relative mx-auto mt-20 max-w-[1240px] overflow-hidden rounded-[32px] bg-brand text-white">
          <NusantaraBackdrop variant="red" />
          <IndonesiaSilhouette className="absolute -bottom-20 -right-24 w-[85%] max-w-none text-white/[0.07]" />
          <div className="relative px-6 pt-14 text-center sm:px-12 sm:pt-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">{t('Kesimpulan', 'Conclusion')}</p>
            <h2 className="text-balance mx-auto mt-4 max-w-3xl text-[34px] font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-[54px]">
              {t('Kenali Risiko.', 'Know the Risk.')} <span className="text-white/60">{t('Pahami Dampaknya.', 'Understand the Impact.')}</span>{' '}
              {t('Ambil Tindakan.', 'Take Action.')}
            </h2>
            <p className="text-pretty mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/80 sm:text-[17px]">
              {t(
                'SiagaAI menerjemahkan data bencana Indonesia menjadi risiko personal dan langkah nyata — untuk setiap warga, setiap hari.',
                'SiagaAI translates Indonesia’s disaster data into personal risk and real action — for every citizen, every day.',
              )}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" className="border-0" onClick={() => launch(FEATURES[0], true)}>
                <PlayCircle /> {t('Coba demo sebagai Ara', 'Try the demo as Ara')}
              </Button>
              <Button asChild size="lg" variant="dark">
                <Link to="/app">
                  <LocateFixed /> {t('Cek lokasi saya', 'Check my location')}
                </Link>
              </Button>
            </div>
          </div>
          <ul className="relative mt-10 flex items-end justify-center gap-1 overflow-hidden px-4 sm:gap-3" aria-label={t('Galeri Ara', 'Ara gallery')}>
            {GALLERY.map((p, i) => (
              <li
                key={p}
                className={cn('shrink-0', i > 4 && 'hidden md:block', i > 2 && 'max-sm:hidden')}
                style={{ animation: `float ${5 + (i % 3)}s ease-in-out ${i * 0.35}s infinite` }}
              >
                <Ara pose={p} size={i % 2 ? 130 : 150} className="drop-shadow-none" />
              </li>
            ))}
          </ul>
        </Reveal>
        <p className="mt-10 text-center text-[22px] font-extrabold tracking-[-0.03em] sm:text-[26px]">
          {t('Terima kasih.', 'Thank you.')} <span className="text-muted">{t('Tetap siaga, Indonesia.', 'Stay ready, Indonesia.')}</span>
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────── Sources

export function SourcesSection() {
  return (
    <section id="sumber" className="pb-20 pt-10">
      <div className={CONTAINER}>
        <details className="group mx-auto max-w-4xl rounded-[22px] border border-line bg-surface shadow-soft">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5 text-[15px] font-bold">
              <BookOpenCheck className="size-[18px] text-brand" /> {t('Sumber & catatan', 'Sources & notes')}
              <span className="tabular rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-muted">{SOURCES.length}</span>
            </span>
            <ArrowRight className="size-4 text-subtle transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-line px-5 pb-5 pt-2 sm:px-6">
            <ol className="divide-y divide-line">
              {SOURCES.map((s, i) => (
                <li key={s.id} className="flex items-start gap-3 py-3 text-[13.5px]">
                  <span className="tabular mt-0.5 w-5 shrink-0 text-subtle">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{s.org}</span> <span className="text-muted">({s.year})</span> — {tx(s.title)}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-neutral-100 hover:text-ink"
                    aria-label={t('Buka sumber (tab baru)', 'Open source (new tab)')}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-xl bg-raised p-3 text-[12.5px] leading-relaxed text-muted">
              {t(
                'Statistik dikutip dari rilis resmi dan media yang memberitakannya; data BNPB 2025 masih bersifat sementara. Ara adalah persona representatif yang disusun dari riset di atas. Semua fitur di demo memakai data live.',
                'Statistics are quoted from official releases and the media that reported them; BNPB 2025 data is still provisional. Ara is a representative persona built from the research above. Every feature in the demo runs on live data.',
              )}
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
