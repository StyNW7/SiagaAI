import {
  ArrowRight,
  Clock,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Waves,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorState, FreshnessBadge } from '@/components/common/data-state';
import { AiPanel, AiThinking, PageHeader } from '@/components/common/layout-bits';
import { Ara } from '@/components/common/ara';
import { HazardIcon, RiskBadge, RiskSpectrum, ScoreBar, ScoreGauge } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { DischargeChart, OutdoorIndexChart } from '@/features/charts/charts';
import { ProfileQuickEdit } from '@/features/profile/profile-quick-edit';
import { FactorBreakdown } from '@/features/risk/components';
import { personalize } from '@/features/risk/engine/assess';
import { describeWindow } from '@/features/risk/engine/timing';
import type { HazardType, PersonalContext } from '@/features/risk/engine/types';
import { useAiContext, useAiMutation } from '@/hooks/use-ai';
import { useDocumentTitle } from '@/hooks/use-misc';
import { useRiskAssessment } from '@/hooks/use-siaga-data';
import { HAZARD_ORDER, HAZARDS, RISK_LEVELS } from '@/lib/risk-levels';
import { cn } from '@/lib/utils';

const PERSONAS: { key: string; label: string; emoji: string; ctx: PersonalContext }[] = [
  {
    key: 'student',
    label: 'Mahasiswa bermotor',
    emoji: '🛵',
    ctx: { occupation: 'student', transport: 'motorcycle', exposure: 'moderate', activity: 'mixed' },
  },
  {
    key: 'outdoor',
    label: 'Pekerja luar ruang',
    emoji: '👷',
    ctx: { occupation: 'outdoor', transport: 'motorcycle', exposure: 'high', activity: 'outdoor' },
  },
  {
    key: 'office',
    label: 'Pekerja kantor bermobil',
    emoji: '💼',
    ctx: { occupation: 'office', transport: 'car', exposure: 'low', activity: 'indoor' },
  },
  {
    key: 'elderly',
    label: 'Lansia di rumah',
    emoji: '👵',
    ctx: {
      occupation: 'other',
      transport: 'public',
      exposure: 'low',
      activity: 'indoor',
      ageGroup: 'elderly',
    },
  },
];

export default function MyRiskPage() {
  useDocumentTitle('Risiko Saya');
  const view = useRiskAssessment();
  const { assessment, location, hourly, windows, river } = view;
  const [params, setParams] = useSearchParams();
  const hazardParam = params.get('hazard') as HazardType | null;
  const [selected, setHazard] = useState<HazardType | null>(
    hazardParam && HAZARDS[hazardParam] ? hazardParam : null,
  );
  const context = useAiContext(view);
  const impact = useAiMutation('impact');

  const personas = useMemo(
    () => (assessment ? PERSONAS.map((p) => ({ ...p, result: personalize(assessment.hazards, p.ctx) })) : []),
    [assessment],
  );

  if (!assessment) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hazard: HazardType = selected ?? assessment.personal.primaryHazard;
  const ph = assessment.personal.hazards[hazard];
  const h = assessment.hazards[hazard];
  const delta = assessment.personal.score - assessment.location.score;

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-ai" /> Personal Impact Forecast
          </span>
        }
        title="Apa artinya bagi saya?"
        description={`Skor ${location.name} disesuaikan dengan pekerjaan, transportasi & aktivitasmu.`}
        mascot="thinking"
      />

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Scores */}
        <Card className="min-w-0 lg:col-span-5">
          <CardContent className="p-6 sm:p-7">
            <p className="data-label">Ringkasan risiko</p>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="telemetry">Lokasi</p>
                <p className="display-metric mt-2 text-[44px] text-neutral-400">
                  {assessment.location.score}
                </p>
                <RiskBadge level={assessment.location.level} className="mt-2.5" />
              </div>
              <div className="mb-10 flex flex-1 flex-col items-center">
                <span
                  className={cn(
                    'font-mono text-[12px] font-semibold',
                    delta > 0 ? 'text-risk-high' : delta < 0 ? 'text-risk-safe' : 'text-subtle',
                  )}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </span>
                <span className="relative mt-1 h-px w-full bg-line-strong">
                  <ArrowRight className="absolute -right-1 -top-[7px] size-3.5 text-line-strong" />
                </span>
                <span className="mt-1 font-mono text-[10px] text-subtle">
                  ×{assessment.personal.modifierAvg.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <p className="telemetry">Personal</p>
                <p
                  className="display-metric mt-2 text-[64px]"
                  style={{ color: RISK_LEVELS[assessment.personal.level].color }}
                >
                  {assessment.personal.score}
                </p>
                <RiskBadge level={assessment.personal.level} className="mt-2.5" />
              </div>
            </div>
            <RiskSpectrum score={assessment.personal.score} className="mt-6" showLabels={false} />
            <p className="mt-4 text-[13px] leading-relaxed text-neutral-600">
              Profilmu membuat paparan{' '}
              <b className={cn(delta > 0 ? 'text-[#A4461A]' : delta < 0 ? 'text-risk-safe' : 'text-ink')}>
                {delta > 0
                  ? `${delta} poin lebih tinggi`
                  : delta < 0
                    ? `${-delta} poin lebih rendah`
                    : 'setara'}
              </b>{' '}
              dari rata-rata.
            </p>
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 flex items-center gap-1.5 text-[13.5px] font-bold">
                <SlidersHorizontal className="size-4 text-brand" /> Ubah profil, lihat dampaknya
              </p>
              <ProfileQuickEdit compact />
              <p className="telemetry mt-4 normal-case tracking-normal">
                Tanpa data medis · tersimpan di perangkatmu
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-5 lg:col-span-7">
          {/* AI impact */}
          <AiPanel
            title="Dampak personal menurut SiagaAI"
            provider={impact.data?.provider}
            fallbackReason={impact.data?.fallback ? impact.data.fallbackReason : undefined}
            generatedAt={impact.data?.generatedAt}
            actions={
              impact.data && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => context && impact.mutate({ context, fresh: true })}
                >
                  <RefreshCw /> Perbarui
                </Button>
              )
            }
          >
            {impact.data ? (
              <div className="animate-fade-up space-y-4">
                <div>
                  <p className="text-[18px] font-bold leading-snug">{impact.data.output.headline}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-700">
                    {impact.data.output.summary}
                  </p>
                </div>
                <ul className="space-y-2.5">
                  {impact.data.output.impacts.map((i) => (
                    <li key={i.hazard} className="flex gap-3 rounded-xl border border-line bg-raised p-3.5">
                      <HazardIcon
                        hazard={i.hazard}
                        level={assessment.personal.hazards[i.hazard].level}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold">{HAZARDS[i.hazard].longLabel}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-700">{i.impact}</p>
                        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-ai">
                          <ArrowRight className="mt-0.5 size-3.5 shrink-0" /> {i.advice}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-raised p-3.5">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold text-muted">
                      <Clock className="size-3.5" /> Waktu
                    </p>
                    <p className="mt-1 text-[13px] text-neutral-700">{impact.data.output.timing}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-raised p-3.5">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold text-muted">
                      <Eye className="size-3.5" /> Waspadai
                    </p>
                    <ul className="mt-1 space-y-0.5 text-[13px] text-neutral-700">
                      {impact.data.output.watchFor.map((x) => (
                        <li key={x}>· {x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button asChild>
                  <Link to="/app/action-plan">
                    Buat Rencana Aksi <ArrowRight />
                  </Link>
                </Button>
              </div>
            ) : impact.isPending ? (
              <AiThinking
                steps={[
                  'Membaca skor bahaya dari Siaga Risk Engine',
                  'Menerapkan konteks pekerjaan & transportasi',
                  'Menyusun dampak dan saran yang relevan',
                ]}
              />
            ) : impact.isError ? (
              <ErrorState
                title="Gagal membuat analisis"
                onRetry={() => context && impact.mutate({ context })}
              />
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
                <Ara pose="explain" size={130} />
                <div className="flex-1 pb-2 text-center sm:text-left">
                  <p className="text-[15px] font-bold leading-snug text-ink">
                    Skor {assessment.personal.score}/100 — apa dampaknya untukmu?
                  </p>
                  <p className="mt-1 text-[13.5px] text-muted">
                    Sebagai {context?.profile.occupation.toLowerCase()} ·{' '}
                    {context?.profile.transport.toLowerCase()}
                  </p>
                  <Button
                    variant="ai"
                    className="mt-4"
                    onClick={() => context && impact.mutate({ context })}
                    disabled={!context}
                  >
                    <Sparkles /> Analisis dampak personal
                  </Button>
                </div>
              </div>
            )}
          </AiPanel>

          {/* Outdoor timing */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Kapan aman beraktivitas di luar?</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">Indeks per jam · makin rendah makin baik</p>
              </div>
            </CardHeader>
            <CardContent>
              {hourly && hourly.length ? (
                <>
                  <OutdoorIndexChart points={hourly} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {windows && windows.length ? (
                      windows.map((w) => (
                        <span
                          key={w.start}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF7F2] px-3 py-1.5 text-[12.5px] font-semibold text-[#17654A] ring-1 ring-inset ring-risk-safe/20"
                        >
                          <Clock className="size-3.5" /> {describeWindow(w)} WIB · {w.reason}
                        </span>
                      ))
                    ) : (
                      <span className="text-[13px] text-muted">
                        Tidak ada jendela waktu yang jelas lebih aman hari ini.
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-muted">Data prakiraan per jam tidak tersedia.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hazard breakdown */}
      <Card className="mt-5">
        <CardHeader className="flex-col sm:flex-row sm:items-center">
          <div>
            <CardTitle>Kenapa skornya segini?</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">Kontribusi tiap indikator · algoritma, bukan AI</p>
          </div>
          <Tabs
            value={hazard}
            onValueChange={(v) => {
              setHazard(v as HazardType);
              setParams({ hazard: v }, { replace: true });
            }}
          >
            <TabsList className="flex-wrap">
              {HAZARD_ORDER.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {HAZARDS[k].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-4">
            <ScoreGauge
              score={ph.score}
              level={ph.level}
              size={200}
              label={`Skor personal ${HAZARDS[hazard].label}`}
              sublabel={`Bahaya ${h.score} × pengubah ${ph.modifier.value.toFixed(2)}`}
            />
            <p className="mt-3 text-center text-[13px] leading-relaxed text-neutral-600">{h.headline}</p>
            <div className="mt-5 rounded-xl border border-line bg-raised p-4">
              <p className="data-label mb-2.5">Pengubah paparan</p>
              {ph.modifier.contributions.length ? (
                <ul className="space-y-1 text-[12.5px]">
                  {ph.modifier.contributions.map((c) => (
                    <li key={c.label} className="flex justify-between">
                      <span>{c.label}</span>
                      <span
                        className={cn(
                          'tabular font-semibold',
                          c.delta > 0 ? 'text-[#A4461A]' : 'text-risk-safe',
                        )}
                      >
                        {c.delta > 0 ? '+' : ''}
                        {Math.round(c.delta * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px] text-muted">
                  Profil Anda tidak mengubah paparan untuk bahaya ini.
                </p>
              )}
            </div>
          </div>
          <div className="min-w-0 lg:col-span-8">
            <FactorBreakdown hazard={h} />
            {hazard === 'flood' && river.data && river.data.series.length > 0 && (
              <div className="mt-6 border-t border-line pt-4">
                <p className="mb-1 flex items-center justify-between gap-2 text-[12px] font-semibold text-muted">
                  <span className="flex items-center gap-1.5">
                    <Waves className="size-3.5" /> Debit sungai terdekat (GloFAS) — garis putus = prakiraan
                  </span>
                  <FreshnessBadge provenance={river.data.provenance} kind="river" />
                </p>
                <DischargeChart series={river.data.series} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Persona comparison */}
      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle>Satu bahaya, dampak berbeda</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">Perbandingan persona di {location.name}</p>
          </div>
          <UserRound className="size-5 text-muted" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => (
            <div key={p.key} className="rounded-xl border border-line bg-raised p-4 sm:p-5">
              <p className="text-[13px] font-semibold">{p.label}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="display-metric text-[32px]">{p.result.score}</span>
                <RiskBadge level={p.result.level} />
              </div>
              <ScoreBar score={p.result.score} level={p.result.level} className="mt-2" />
              <p className="mt-2 text-[12px] text-muted">
                Pengubah ×{p.result.modifierAvg.toFixed(2)} · utama{' '}
                {HAZARDS[p.result.primaryHazard].label.toLowerCase()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
