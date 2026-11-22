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
import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorState, FreshnessBadge } from '@/components/common/data-state';
import { AiPanel, AiThinking, PageHeader } from '@/components/common/layout-bits';
import { HazardIcon, RiskBadge, ScoreBar, ScoreGauge } from '@/components/common/risk';
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
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-ai" /> Personal Impact Forecast
          </span>
        }
        title="Apa artinya bagi saya?"
        description={`Bahaya yang sama berdampak berbeda pada setiap orang. SiagaAI menyesuaikan skor risiko ${location.name} dengan pekerjaan, transportasi & aktivitas Anda.`}
      />

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Scores */}
        <Card className="min-w-0 lg:col-span-5">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-neutral-50 p-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Skor lokasi</p>
                <p className="tabular mt-1 text-[36px] font-extrabold leading-none">
                  {assessment.location.score}
                </p>
                <RiskBadge level={assessment.location.level} className="mt-2" />
              </div>
              <div
                className="rounded-2xl p-4 text-center ring-2"
                style={
                  {
                    background: RISK_LEVELS[assessment.personal.level].soft,
                    '--tw-ring-color': RISK_LEVELS[assessment.personal.level].color,
                  } as CSSProperties
                }
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Skor personal</p>
                <p className="tabular mt-1 text-[36px] font-extrabold leading-none">
                  {assessment.personal.score}
                </p>
                <RiskBadge level={assessment.personal.level} className="mt-2" />
              </div>
            </div>
            <p className="mt-4 text-center text-[13px] text-neutral-600">
              Profil Anda membuat paparan{' '}
              <b className={cn(delta > 0 ? 'text-orange-700' : delta < 0 ? 'text-green-700' : 'text-ink')}>
                {delta > 0
                  ? `+${delta} poin lebih tinggi`
                  : delta < 0
                    ? `${delta} poin lebih rendah`
                    : 'setara'}
              </b>{' '}
              dibanding rata-rata (pengubah rata-rata ×{assessment.personal.modifierAvg.toFixed(2)}).
            </p>
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold">
                <SlidersHorizontal className="size-4 text-muted" /> Konteks personal — ubah untuk melihat
                dampaknya
              </p>
              <ProfileQuickEdit compact />
              <p className="mt-3 text-[11.5px] text-muted">
                Tidak ada data medis yang diminta. Profil tersimpan di perangkat Anda.
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
                    <li key={i.hazard} className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-indigo-100">
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
                  <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold text-muted">
                      <Clock className="size-3.5" /> Waktu
                    </p>
                    <p className="mt-1 text-[13px] text-neutral-700">{impact.data.output.timing}</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
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
              <div className="flex flex-col items-start gap-3">
                <p className="text-[14px] leading-relaxed text-neutral-700">
                  SiagaAI akan menerjemahkan skor <b>{assessment.personal.score}/100</b> menjadi dampak nyata
                  pada aktivitas Anda sebagai <b>{context?.profile.occupation.toLowerCase()}</b> yang
                  menggunakan <b>{context?.profile.transport.toLowerCase()}</b>.
                </p>
                <Button
                  variant="ai"
                  size="lg"
                  onClick={() => context && impact.mutate({ context })}
                  disabled={!context}
                >
                  <Sparkles /> Apa artinya bagi saya?
                </Button>
              </div>
            )}
          </AiPanel>

          {/* Outdoor timing */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Kapan aman beraktivitas di luar?</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">
                  Indeks per jam dari hujan, petir, panas & PM2.5 — makin rendah makin baik
                </p>
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
                          className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[12.5px] font-semibold text-green-800"
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
            <CardTitle>Bagaimana skor dihitung</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">
              Algoritma menghitung — AI hanya menjelaskan. Pilih bahaya untuk melihat indikatornya.
            </p>
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
                  {HAZARDS[k].emoji} {HAZARDS[k].label}
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
            <div className="mt-4 rounded-xl bg-neutral-50 p-3">
              <p className="mb-2 text-[12px] font-bold text-muted">
                Pengubah paparan ({HAZARDS[hazard].label})
              </p>
              {ph.modifier.contributions.length ? (
                <ul className="space-y-1 text-[12.5px]">
                  {ph.modifier.contributions.map((c) => (
                    <li key={c.label} className="flex justify-between">
                      <span>{c.label}</span>
                      <span
                        className={cn(
                          'tabular font-semibold',
                          c.delta > 0 ? 'text-orange-700' : 'text-green-700',
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
            <p className="mt-1 text-[12.5px] text-muted">
              Perbandingan deterministik di {location.name} untuk berbagai persona
            </p>
          </div>
          <UserRound className="size-5 text-muted" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => (
            <div key={p.key} className="rounded-xl border border-line p-4">
              <p className="text-[13px] font-semibold">
                <span aria-hidden>{p.emoji}</span> {p.label}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="tabular text-[26px] font-bold">{p.result.score}</span>
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
