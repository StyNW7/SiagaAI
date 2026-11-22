import {
  AlarmClock,
  Backpack,
  Check,
  ClipboardCheck,
  History,
  Phone,
  Printer,
  RefreshCw,
  Share2,
  ShieldAlert,
  Siren,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/data-state';
import { Ara, AraSays } from '@/components/common/ara';
import { AiThinking, Disclaimer, PageHeader } from '@/components/common/layout-bits';
import { RiskBadge } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, Progress } from '@/components/ui/primitives';
import { EMERGENCY_CONTACTS, GO_BAG } from '@/data/preparedness';
import { useAiContext, useAiMutation } from '@/hooks/use-ai';
import { useDocumentTitle, useOnline } from '@/hooks/use-misc';
import { useRiskAssessment } from '@/hooks/use-siaga-data';
import { formatDateTime } from '@/lib/format';
import { HAZARDS } from '@/lib/risk-levels';
import { cn } from '@/lib/utils';
import { usePlanStore, type SavedPlan } from '@/stores';

const SECTIONS = [
  {
    key: 'rightNow',
    label: 'Now',
    title: 'Sekarang',
    subtitle: 'Lakukan segera',
    icon: Zap,
    accent: '#D71920',
    priority: 'Tinggi',
  },
  {
    key: 'nextHours',
    label: 'Next hours',
    title: 'Beberapa jam ke depan',
    subtitle: 'Persiapan berikutnya',
    icon: AlarmClock,
    accent: '#D99A22',
    priority: 'Sedang',
  },
  {
    key: 'ifWorsens',
    label: 'If worsens',
    title: 'Jika kondisi memburuk',
    subtitle: 'Eskalasi & keselamatan',
    icon: Siren,
    accent: '#A51E22',
    priority: 'Siaga',
  },
] as const;

export default function ActionPlanPage() {
  useDocumentTitle('Rencana Aksi');
  const view = useRiskAssessment();
  const { assessment, location, scenario } = view;
  const context = useAiContext(view);
  const gen = useAiMutation('action-plan');
  const { plans, save, toggle, remove } = usePlanStore();
  const [activeId, setActiveId] = useState<string | null>(plans[0]?.id ?? null);
  const online = useOnline();
  const active = plans.find((p) => p.id === activeId) ?? null;

  const generate = (fresh = false) => {
    if (!context || !assessment) return;
    gen.mutate(
      { context, fresh },
      {
        onSuccess: (r) => {
          const p = save({
            locationName: location.name,
            level: assessment.personal.level,
            score: assessment.personal.score,
            primaryHazard: assessment.personal.primaryHazard,
            plan: r.output,
            provider: r.provider,
            scenario: !!scenario,
          });
          setActiveId(p.id);
          toast.success('Rencana aksi tersimpan', { description: 'Tersedia juga saat offline.' });
        },
      },
    );
  };

  const share = async (p: SavedPlan) => {
    const text = [
      `${p.plan.title} (${formatDateTime(p.createdAt)})`,
      '',
      'SEKARANG:',
      ...p.plan.rightNow.map((x) => `• ${x}`),
      '',
      'BEBERAPA JAM KE DEPAN:',
      ...p.plan.nextHours.map((x) => `• ${x}`),
      '',
      'JIKA MEMBURUK:',
      ...p.plan.ifWorsens.map((x) => `• ${x}`),
      '',
      'Darurat: 112 · Dibuat dengan SiagaAI — bukan peringatan resmi.',
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ title: p.plan.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Rencana disalin ke clipboard');
      }
    } catch {
      /* user cancelled */
    }
  };

  const total = active
    ? active.plan.rightNow.length + active.plan.nextHours.length + active.plan.ifWorsens.length
    : 0;

  const progress = active ? Math.round((active.checked.length / Math.max(1, total)) * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheck className="size-3.5" /> Rencana kesiapsiagaan
          </span>
        }
        title="Rencana aksi Anda"
        description={`${location.name}${assessment ? ` · skor ${assessment.personal.score} · ${HAZARDS[assessment.personal.primaryHazard].label.toLowerCase()}` : ''}`}
        mascot="checklist"
        actions={
          <Button
            variant={active ? 'secondary' : 'primary'}
            onClick={() => generate(!!active)}
            disabled={!context || gen.isPending}
          >
            {gen.isPending ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <Sparkles className={active ? 'text-ai' : ''} />
            )}{' '}
            {active ? 'Perbarui rencana' : 'Buat Rencana Aksi'}
          </Button>
        }
      />

      {gen.isPending ? (
        <Card className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:p-10">
          <Ara pose="checklist" size={150} float />
          <AiThinking
            steps={[
              'Membaca bahaya utama & level risiko',
              `Menyesuaikan profil (${context?.profile.transport ?? ''})`,
              'Memilih langkah dari panduan BNPB/BMKG',
              'Memvalidasi struktur rencana',
            ]}
          />
        </Card>
      ) : active ? (
        <section aria-label="Papan rencana aksi">
          {/* Plan summary strip */}
          <div className="mb-5 grid gap-5 rounded-[18px] border border-line bg-white p-5 shadow-soft sm:p-6 lg:grid-cols-[1fr_280px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={active.level} />
                <span className="telemetry">
                  {active.locationName} · {formatDateTime(active.createdAt)}
                  {active.scenario && ' · simulasi'}
                </span>
              </div>
              <h2 className="mt-2.5 text-[20px] font-bold leading-snug tracking-[-0.02em]">
                {active.plan.title}
              </h2>
              <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-neutral-600">
                {active.plan.summary}
              </p>
              <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ai">
                ✦ {active.provider}
              </p>
            </div>
            <div className="flex items-center gap-4 lg:flex-col lg:items-stretch">
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="data-label">Progres</span>
                  <span className="display-metric text-[28px]">
                    {progress}
                    <span className="font-mono text-[12px] text-subtle">%</span>
                  </span>
                </div>
                <Progress value={progress} color="#208A61" label="Progres rencana aksi" className="mt-2" />
                <p className="telemetry mt-2 normal-case tracking-normal">
                  {active.checked.length} dari {total} langkah selesai
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => share(active)} className="flex-1">
                  <Share2 /> Bagikan
                </Button>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => window.print()}
                  aria-label="Cetak rencana"
                >
                  <Printer />
                </Button>
              </div>
            </div>
          </div>

          {progress === 100 && (
            <AraSays pose="success" size={90} tone="calm" className="mb-5" title="Semua langkah selesai! 🎉">
              Kamu sudah siap. Tetap pantau info resmi BMKG & BPBD.
            </AraSays>
          )}

          {/* Kanban */}
          <div className="snap-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {SECTIONS.map((sec) => {
              const items = active.plan[sec.key];
              const doneCount = items.filter((_, i) => active.checked.includes(`${sec.key}:${i}`)).length;
              return (
                <section
                  key={sec.key}
                  className="flex w-[82vw] max-w-[360px] shrink-0 flex-col rounded-[16px] border border-line bg-sidebar/70 p-3 md:w-auto md:max-w-none"
                >
                  <header className="flex items-center justify-between px-2 pb-3 pt-1.5">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: sec.accent }} aria-hidden />
                      <h3 className="text-[14px] font-bold">{sec.title}</h3>
                    </div>
                    <span className="font-mono text-[11px] text-subtle">
                      {doneCount}/{items.length}
                    </span>
                  </header>
                  <ul className="flex flex-1 flex-col gap-2">
                    {items.map((item, i) => {
                      const key = `${sec.key}:${i}`;
                      const done = active.checked.includes(key);
                      return (
                        <li key={key}>
                          <button
                            onClick={() => toggle(active.id, key)}
                            role="checkbox"
                            aria-checked={done}
                            className={cn(
                              'group relative flex w-full items-start gap-3 overflow-hidden rounded-xl border bg-white p-3.5 text-left shadow-soft transition-all duration-200 hover:-translate-y-px hover:shadow-lift',
                              done ? 'border-line opacity-70' : 'border-line',
                            )}
                          >
                            <span
                              className="absolute inset-y-0 left-0 w-[3px]"
                              style={{ background: done ? '#208A61' : sec.accent }}
                              aria-hidden
                            />
                            <span
                              className={cn(
                                'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] transition-colors',
                                done
                                  ? 'border-risk-safe bg-risk-safe text-white'
                                  : 'border-line-strong group-hover:border-neutral-500',
                              )}
                            >
                              {done && <Check className="size-3.5" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  'block text-[13.5px] font-medium leading-snug',
                                  done && 'text-muted line-through',
                                )}
                              >
                                {item}
                              </span>
                              <span className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-subtle">
                                <span style={{ color: done ? '#208A61' : sec.accent }}>
                                  {done ? 'Selesai' : sec.priority}
                                </span>
                                · ✦ AI
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-neutral-700">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand" /> {active.plan.officialNote}
          </p>
        </section>
      ) : (
        <EmptyState
          pose="checklist"
          title="Belum ada rencana aksi"
          description={
            assessment
              ? `Buat rencana personal untuk ${location.name}. Tersimpan & bisa dibuka offline.`
              : 'Menunggu analisis risiko selesai…'
          }
          action={
            <Button onClick={() => generate()} disabled={!context}>
              <Sparkles /> Buat Rencana Aksi Saya
            </Button>
          }
        />
      )}
      {!online && (
        <p className="telemetry mt-3 normal-case tracking-normal">
          Offline — rencana dibuat Local Reasoner dari data terakhir.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="min-w-0 lg:col-span-8">
          <GoBag />
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="size-4 text-brand" /> Nomor darurat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-line">
                {EMERGENCY_CONTACTS.map((c) => (
                  <li key={c.number}>
                    <a
                      href={`tel:${c.number}`}
                      className="flex items-center gap-3.5 rounded-lg py-2.5 transition-colors hover:bg-raised"
                    >
                      <span
                        className={cn(
                          'grid h-10 w-14 place-items-center rounded-lg font-mono text-[15px] font-semibold',
                          c.number === '112' ? 'bg-brand text-white' : 'bg-neutral-100 text-ink',
                        )}
                      >
                        {c.number}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold">{c.label}</span>
                        <span className="block text-[12px] text-muted">{c.note}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4 text-muted" /> Riwayat rencana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plans.length ? (
                <ul className="space-y-1">
                  {plans.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-2.5 py-2',
                        p.id === activeId ? 'bg-neutral-100' : 'hover:bg-raised',
                      )}
                    >
                      <button className="min-w-0 flex-1 text-left" onClick={() => setActiveId(p.id)}>
                        <span className="block truncate text-[13.5px] font-semibold">{p.locationName}</span>
                        <span className="block font-mono text-[10.5px] text-subtle">
                          {formatDateTime(p.createdAt)} · {p.checked.length} selesai
                          {p.scenario ? ' · simulasi' : ''}
                        </span>
                      </button>
                      <RiskBadge level={p.level} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Hapus rencana"
                        onClick={() => {
                          remove(p.id);
                          if (p.id === activeId) setActiveId(null);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">Rencana yang kamu buat akan muncul di sini.</p>
              )}
            </CardContent>
          </Card>
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}

function GoBag() {
  const [checked, setChecked] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('siaga.gobag') ?? '[]'),
  );
  useEffect(() => {
    localStorage.setItem('siaga.gobag', JSON.stringify(checked));
  }, [checked]);
  const all = GO_BAG.flatMap((g) => g.items);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Backpack className="size-4 text-brand" /> Tas Siaga Bencana
          </CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">Konsep Tas Siaga Bencana BNPB · tersedia offline</p>
        </div>
        <span className="font-mono text-[12px] font-medium text-muted">
          {checked.length}/{all.length}
        </span>
      </CardHeader>
      <CardContent>
        <Progress
          value={(checked.length / all.length) * 100}
          color="#208A61"
          label="Kelengkapan tas siaga"
          className="mb-4"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GO_BAG.map((g) => (
            <div key={g.group}>
              <p className="data-label mb-2">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const done = checked.includes(item);
                  return (
                    <li key={item}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-[13.5px] transition-colors hover:bg-raised">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() =>
                            setChecked((c) => (done ? c.filter((x) => x !== item) : [...c, item]))
                          }
                          className="mt-0.5 size-4 accent-[#208A61]"
                        />
                        <span className={cn(done && 'text-muted line-through')}>{item}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
