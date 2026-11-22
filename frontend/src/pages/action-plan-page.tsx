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
import { t } from '@/lib/i18n';

const sections = () =>
  [
    {
      key: 'rightNow',
      label: 'Now',
      title: t('Sekarang', 'Right now'),
      subtitle: t('Lakukan segera', 'Do it immediately'),
      icon: Zap,
      accent: '#D71920',
      priority: t('Tinggi', 'High'),
    },
    {
      key: 'nextHours',
      label: 'Next hours',
      title: t('Beberapa jam ke depan', 'Next few hours'),
      subtitle: t('Persiapan berikutnya', 'Next preparations'),
      icon: AlarmClock,
      accent: '#D99A22',
      priority: t('Sedang', 'Medium'),
    },
    {
      key: 'ifWorsens',
      label: 'If worsens',
      title: t('Jika kondisi memburuk', 'If conditions worsen'),
      subtitle: t('Eskalasi & keselamatan', 'Escalation & safety'),
      icon: Siren,
      accent: '#E8464C',
      priority: t('Siaga', 'Alert'),
    },
  ] as const;

export default function ActionPlanPage() {
  useDocumentTitle(t('Rencana Aksi', 'Action Plan'));
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
          toast.success(t('Rencana aksi tersimpan', 'Action plan saved'), {
            description: t('Tersedia juga saat offline.', 'Also available offline.'),
          });
        },
      },
    );
  };

  const share = async (p: SavedPlan) => {
    const text = [
      `${p.plan.title} (${formatDateTime(p.createdAt)})`,
      '',
      t('SEKARANG:', 'RIGHT NOW:'),
      ...p.plan.rightNow.map((x) => `• ${x}`),
      '',
      t('BEBERAPA JAM KE DEPAN:', 'NEXT FEW HOURS:'),
      ...p.plan.nextHours.map((x) => `• ${x}`),
      '',
      t('JIKA MEMBURUK:', 'IF IT WORSENS:'),
      ...p.plan.ifWorsens.map((x) => `• ${x}`),
      '',
      t(
        'Darurat: 112 · Dibuat dengan SiagaAI — bukan peringatan resmi.',
        'Emergency: 112 · Made with SiagaAI — not an official warning.',
      ),
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ title: p.plan.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success(t('Rencana disalin ke clipboard', 'Plan copied to clipboard'));
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
            <ClipboardCheck className="size-3.5" /> {t('Rencana kesiapsiagaan', 'Preparedness plan')}
          </span>
        }
        title={t('Rencana aksi Anda', 'Your action plan')}
        description={`${location.name}${assessment ? ` · ${t('skor', 'score')} ${assessment.personal.score} · ${HAZARDS[assessment.personal.primaryHazard].label.toLowerCase()}` : ''}`}
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
            {active ? t('Perbarui rencana', 'Refresh plan') : t('Buat Rencana Aksi', 'Create Action Plan')}
          </Button>
        }
      />

      {gen.isPending ? (
        <Card className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:p-10">
          <Ara pose="checklist" size={150} float />
          <AiThinking
            steps={[
              t('Membaca bahaya utama & level risiko', 'Reading the main hazard & risk level'),
              t(
                `Menyesuaikan profil (${context?.profile.transport ?? ''})`,
                `Tailoring to your profile (${context?.profile.transport ?? ''})`,
              ),
              t('Memilih langkah dari panduan BNPB/BMKG', 'Choosing steps from BNPB/BMKG guidance'),
              t('Memvalidasi struktur rencana', 'Validating the plan structure'),
            ]}
          />
        </Card>
      ) : active ? (
        <section aria-label={t('Papan rencana aksi', 'Action plan board')}>
          {/* Plan summary strip */}
          <div className="mb-5 grid gap-5 rounded-[18px] border border-line bg-surface p-5 shadow-soft sm:p-6 lg:grid-cols-[1fr_280px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={active.level} />
                <span className="telemetry">
                  {active.locationName} · {formatDateTime(active.createdAt)}
                  {active.scenario && t(' · simulasi', ' · simulation')}
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
                  <span className="data-label">{t('Progres', 'Progress')}</span>
                  <span className="display-metric text-[28px]">
                    {progress}
                    <span className="font-mono text-[12px] text-subtle">%</span>
                  </span>
                </div>
                <Progress
                  value={progress}
                  color="#208A61"
                  label={t('Progres rencana aksi', 'Action plan progress')}
                  className="mt-2"
                />
                <p className="telemetry mt-2 normal-case tracking-normal">
                  {t(
                    `${active.checked.length} dari ${total} langkah selesai`,
                    `${active.checked.length} of ${total} steps done`,
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => share(active)} className="flex-1">
                  <Share2 /> {t('Bagikan', 'Share')}
                </Button>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => window.print()}
                  aria-label={t('Cetak rencana', 'Print plan')}
                >
                  <Printer />
                </Button>
              </div>
            </div>
          </div>

          {(active.locationName !== location.name ||
            Date.now() - new Date(active.createdAt).getTime() > 12 * 3_600_000) && (
            <div
              role="status"
              className="mb-5 flex flex-col gap-3 rounded-[16px] border border-risk-moderate/30 bg-[var(--risk-moderate-soft)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <p className="flex items-start gap-2.5 text-[14px] leading-snug">
                <History className="mt-0.5 size-4 shrink-0 text-[var(--risk-moderate-text)]" aria-hidden />
                <span>
                  {active.locationName !== location.name
                    ? t(
                        `Rencana ini untuk ${active.locationName}. Lokasi aktif sekarang ${location.name}.`,
                        `This plan is for ${active.locationName}. Your active location is now ${location.name}.`,
                      )
                    : t(
                        'Rencana ini dibuat lebih dari 12 jam lalu.',
                        'This plan was made over 12 hours ago.',
                      )}
                </span>
              </p>
              <Button
                size="sm"
                onClick={() => generate(true)}
                disabled={!context || gen.isPending}
                className="shrink-0"
              >
                <Sparkles /> {t(`Buat untuk ${location.name}`, `Create for ${location.name}`)}
              </Button>
            </div>
          )}

          {progress === 100 && (
            <AraSays
              pose="success"
              size={90}
              tone="calm"
              className="mb-5"
              title={t('Semua langkah selesai! 🎉', 'All steps done! 🎉')}
            >
              {t(
                'Kamu sudah siap. Tetap pantau info resmi BMKG & BPBD.',
                "You're prepared. Keep monitoring official BMKG & BPBD updates.",
              )}
            </AraSays>
          )}

          {/* Kanban */}
          <div className="snap-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {sections().map((sec) => {
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
                              'group relative flex w-full items-start gap-3 overflow-hidden rounded-xl border bg-surface p-3.5 text-left shadow-soft transition-all duration-200 hover:-translate-y-px hover:shadow-lift',
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
                                  {done ? t('Selesai', 'Done') : sec.priority}
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

          <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-neutral-700">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand" /> {active.plan.officialNote}
          </p>
        </section>
      ) : (
        <EmptyState
          pose="checklist"
          title={t('Belum ada rencana aksi', 'No action plan yet')}
          description={
            assessment
              ? t(
                  `Buat rencana personal untuk ${location.name}. Tersimpan & bisa dibuka offline.`,
                  `Create a personal plan for ${location.name}. It's saved & opens offline.`,
                )
              : t('Menunggu analisis risiko selesai…', 'Waiting for the risk analysis to finish…')
          }
          action={
            <Button onClick={() => generate()} disabled={!context}>
              <Sparkles /> {t('Buat Rencana Aksi Saya', 'Create My Action Plan')}
            </Button>
          }
        />
      )}
      {!online && (
        <p className="telemetry mt-3 normal-case tracking-normal">
          {t(
            'Offline — rencana dibuat Local Reasoner dari data terakhir.',
            'Offline — plans are made by the Local Reasoner from the latest data.',
          )}
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
                <Phone className="size-4 text-brand" /> {t('Nomor darurat', 'Emergency numbers')}
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
                <History className="size-4 text-muted" /> {t('Riwayat rencana', 'Plan history')}
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
                          {formatDateTime(p.createdAt)} · {p.checked.length} {t('selesai', 'done')}
                          {p.scenario ? t(' · simulasi', ' · simulation') : ''}
                        </span>
                      </button>
                      <RiskBadge level={p.level} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('Hapus rencana', 'Delete plan')}
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
                <p className="text-[13px] text-muted">
                  {t('Rencana yang kamu buat akan muncul di sini.', 'Plans you create will appear here.')}
                </p>
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
  // Items are keyed by position ("group:item") so checks survive a language switch.
  const [checked, setChecked] = useState<string[]>(() =>
    (JSON.parse(localStorage.getItem('siaga.gobag.v2') ?? '[]') as string[]).filter((k) =>
      /^\d+:\d+$/.test(k),
    ),
  );
  useEffect(() => {
    localStorage.setItem('siaga.gobag.v2', JSON.stringify(checked));
  }, [checked]);
  const all = GO_BAG.flatMap((g) => g.items);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Backpack className="size-4 text-brand" /> {t('Tas Siaga Bencana', 'Disaster Go-Bag')}
          </CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">
            {t(
              'Konsep Tas Siaga Bencana BNPB · tersedia offline',
              'Based on the BNPB Go-Bag concept · available offline',
            )}
          </p>
        </div>
        <span className="font-mono text-[12px] font-medium text-muted">
          {checked.length}/{all.length}
        </span>
      </CardHeader>
      <CardContent>
        <Progress
          value={(checked.length / all.length) * 100}
          color="#208A61"
          label={t('Kelengkapan tas siaga', 'Go-bag completeness')}
          className="mb-4"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GO_BAG.map((g, gi) => (
            <div key={g.group}>
              <p className="data-label mb-2">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((item, ii) => {
                  const id = `${gi}:${ii}`;
                  const done = checked.includes(id);
                  return (
                    <li key={id}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-[13.5px] transition-colors hover:bg-raised">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => setChecked((c) => (done ? c.filter((x) => x !== id) : [...c, id]))}
                          className="mt-0.5 size-4 accent-risk-safe"
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
