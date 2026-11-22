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
import { AiPanel, AiThinking, Disclaimer, PageHeader } from '@/components/common/layout-bits';
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
    title: 'Sekarang',
    subtitle: 'Lakukan segera',
    icon: Zap,
    tone: 'bg-brand-soft text-brand-dark',
  },
  {
    key: 'nextHours',
    title: 'Beberapa jam ke depan',
    subtitle: 'Persiapan berikutnya',
    icon: AlarmClock,
    tone: 'bg-amber-50 text-amber-800',
  },
  {
    key: 'ifWorsens',
    title: 'Jika kondisi memburuk',
    subtitle: 'Eskalasi & keselamatan',
    icon: Siren,
    tone: 'bg-red-50 text-red-800',
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

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheck className="size-3.5" /> AI Action Plan
          </span>
        }
        title="Rencana aksi Anda"
        description="Langkah konkret yang disusun dari skor risiko, kondisi cuaca & profil Anda. Centang setiap langkah — tersimpan & bisa diakses offline."
        actions={
          <Button
            variant="ai"
            size="lg"
            onClick={() => generate(!!active)}
            disabled={!context || gen.isPending}
          >
            {gen.isPending ? <RefreshCw className="animate-spin" /> : <Sparkles />}{' '}
            {active ? 'Buat ulang rencana' : 'Buat Rencana Aksi Saya'}
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-8">
          {gen.isPending ? (
            <AiPanel title="Menyusun rencana aksi">
              <AiThinking
                steps={[
                  'Membaca hazard utama & level risiko',
                  `Menyesuaikan dengan profil (${context?.profile.transport ?? ''})`,
                  'Memilih langkah dari panduan kesiapsiagaan BNPB/BMKG',
                  'Memvalidasi struktur rencana',
                ]}
              />
            </AiPanel>
          ) : active ? (
            <AiPanel
              title={active.plan.title}
              provider={active.provider}
              generatedAt={active.createdAt}
              actions={
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => share(active)}
                    aria-label="Bagikan rencana"
                  >
                    <Share2 />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => window.print()}
                    aria-label="Cetak rencana"
                  >
                    <Printer />
                  </Button>
                </div>
              }
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                <RiskBadge level={active.level} />
                <span>
                  {active.locationName} · skor personal {active.score} · bahaya utama{' '}
                  {HAZARDS[active.primaryHazard].label.toLowerCase()}
                  {active.scenario && ' · SIMULASI'}
                </span>
              </div>
              <p className="mb-4 text-[14px] leading-relaxed text-neutral-700">{active.plan.summary}</p>
              <div className="mb-5">
                <div className="mb-1 flex justify-between text-[12px] font-semibold text-muted">
                  <span>Progres kesiapsiagaan</span>
                  <span className="tabular">
                    {active.checked.length}/{total}
                  </span>
                </div>
                <Progress
                  value={(active.checked.length / Math.max(1, total)) * 100}
                  color="#16A34A"
                  label="Progres rencana aksi"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {SECTIONS.map((s) => (
                  <section key={s.key} className="rounded-2xl bg-white p-4 ring-1 ring-indigo-100">
                    <h3 className="flex items-center gap-2 text-[13px] font-bold">
                      <span className={cn('grid size-7 place-items-center rounded-lg', s.tone)}>
                        <s.icon className="size-4" />
                      </span>
                      <span>
                        {s.title}
                        <span className="block text-[11px] font-medium text-muted">{s.subtitle}</span>
                      </span>
                    </h3>
                    <ul className="mt-3 space-y-1">
                      {active.plan[s.key].map((item, i) => {
                        const key = `${s.key}:${i}`;
                        const done = active.checked.includes(key);
                        return (
                          <li key={key}>
                            <button
                              onClick={() => toggle(active.id, key)}
                              role="checkbox"
                              aria-checked={done}
                              className="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-2 text-left text-[13px] leading-snug transition-colors hover:bg-neutral-50"
                            >
                              <span
                                className={cn(
                                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors',
                                  done ? 'border-green-600 bg-green-600 text-white' : 'border-neutral-300',
                                )}
                              >
                                {done && <Check className="size-3.5" strokeWidth={3} />}
                              </span>
                              <span className={cn(done && 'text-muted line-through')}>{item}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-white p-3 text-[12.5px] text-neutral-700 ring-1 ring-indigo-100">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand" /> {active.plan.officialNote}
              </p>
            </AiPanel>
          ) : (
            <EmptyState
              icon={<ClipboardCheck className="size-5" />}
              title="Belum ada rencana aksi"
              description={
                assessment
                  ? `Buat rencana personal untuk ${location.name} (skor ${assessment.personal.score}/100). Rencana tersimpan di perangkat & tersedia offline.`
                  : 'Menunggu analisis risiko selesai…'
              }
              action={
                <Button variant="ai" onClick={() => generate()} disabled={!context}>
                  <Sparkles /> Buat Rencana Aksi Saya
                </Button>
              }
            />
          )}
          {!online && (
            <p className="text-[12.5px] text-muted">
              Anda sedang offline — rencana dibuat oleh SiagaAI Local Reasoner dari data terakhir.
            </p>
          )}

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
              <ul className="space-y-1.5">
                {EMERGENCY_CONTACTS.map((c) => (
                  <li key={c.number}>
                    <a
                      href={`tel:${c.number}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-neutral-50"
                    >
                      <span
                        className={cn(
                          'tabular grid h-10 w-14 place-items-center rounded-lg text-[15px] font-extrabold',
                          c.number === '112' ? 'bg-brand text-white' : 'bg-neutral-100',
                        )}
                      >
                        {c.number}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold">{c.label}</span>
                        <span className="block text-[11.5px] text-muted">{c.note}</span>
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
                        'flex items-center gap-2 rounded-xl px-2 py-2',
                        p.id === activeId ? 'bg-neutral-100' : 'hover:bg-neutral-50',
                      )}
                    >
                      <button className="min-w-0 flex-1 text-left" onClick={() => setActiveId(p.id)}>
                        <span className="block truncate text-[13px] font-semibold">{p.locationName}</span>
                        <span className="block text-[11.5px] text-muted">
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
                <p className="text-[13px] text-muted">Rencana yang Anda buat akan muncul di sini.</p>
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
          <p className="mt-1 text-[12.5px] text-muted">
            Checklist kesiapsiagaan keluarga (mengacu konsep Tas Siaga Bencana BNPB) — tersedia offline
          </p>
        </div>
        <span className="tabular text-[13px] font-semibold text-muted">
          {checked.length}/{all.length}
        </span>
      </CardHeader>
      <CardContent>
        <Progress
          value={(checked.length / all.length) * 100}
          color="#16A34A"
          label="Kelengkapan tas siaga"
          className="mb-4"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GO_BAG.map((g) => (
            <div key={g.group}>
              <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-muted">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const done = checked.includes(item);
                  return (
                    <li key={item}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 text-[13px] hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() =>
                            setChecked((c) => (done ? c.filter((x) => x !== item) : [...c, item]))
                          }
                          className="mt-0.5 size-4 accent-green-600"
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
