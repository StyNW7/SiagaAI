import { Check, ChevronRight, CircleDashed, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FreshnessBadge } from '@/components/common/data-state';
import { Ara } from '@/components/common/ara';
import { HAZARD_ICONS, RiskBadge, ScoreBar } from '@/components/common/risk';
import { Card } from '@/components/ui/primitives';
import { Tip } from '@/components/ui/overlays';
import type { SourceState } from '@/hooks/use-siaga-data';
import { HAZARDS, RISK_LEVELS } from '@/lib/risk-levels';
import { cn } from '@/lib/utils';
import type { Provenance } from '@/types/domain';
import type { HazardScore, PersonalHazardScore } from './engine/types';

export function HazardCard({
  hazard,
  personal,
  onClick,
  active,
}: {
  hazard: HazardScore;
  personal?: PersonalHazardScore;
  onClick?: () => void;
  active?: boolean;
}) {
  const meta = HAZARDS[hazard.hazard];
  const score = personal?.score ?? hazard.score;
  const level = personal?.level ?? hazard.level;
  const color = hazard.available ? RISK_LEVELS[level].color : '#D4D2CC';
  const Icon = HAZARD_ICONS[hazard.hazard];
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-card border bg-white p-4 text-left shadow-soft transition-all duration-200 sm:p-5',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lift',
        active ? 'border-ink ring-1 ring-ink' : 'border-line',
      )}
    >
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <span className="data-label flex items-center gap-1.5 !text-ink">
          <Icon className="size-4" style={{ color }} aria-hidden />
          {meta.label}
        </span>
        {hazard.available ? (
          <RiskBadge level={level} />
        ) : (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-neutral-500">
            N/A
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="display-metric text-[34px] text-ink">{hazard.available ? score : '–'}</span>
        <span className="font-mono text-[11px] text-subtle">/100</span>
      </div>
      <ScoreBar score={hazard.available ? score : 0} level={level} className="mt-2.5" />
      <p className="mt-3 line-clamp-2 text-[12.5px] leading-snug text-muted">{hazard.headline}</p>
      {hazard.available && hazard.confidence !== 'high' && (
        <p className="mt-auto pt-2 font-mono text-[10px] uppercase tracking-[0.04em] text-[#8A5A0B]">
          Keyakinan {hazard.confidence === 'medium' ? 'sedang' : 'rendah'}
        </p>
      )}
    </Comp>
  );
}

/** Compact intelligence-list row: accent strip · icon · hazard · level · measurement · score. */
export function HazardRow({
  hazard,
  personal,
  onClick,
}: {
  hazard: HazardScore;
  personal?: PersonalHazardScore;
  onClick?: () => void;
}) {
  const meta = HAZARDS[hazard.hazard];
  const score = personal?.score ?? hazard.score;
  const level = personal?.level ?? hazard.level;
  const color = hazard.available ? RISK_LEVELS[level].color : '#D4D2CC';
  const Icon = HAZARD_ICONS[hazard.hazard];
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center gap-4 rounded-xl py-3.5 pl-5 pr-2 text-left transition-colors hover:bg-raised"
    >
      <span
        className="absolute inset-y-3.5 left-0 w-[3px] rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <Icon className="size-5 shrink-0" style={{ color }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-ink">{meta.label}</span>
          {hazard.available ? (
            <span
              className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: RISK_LEVELS[level].text }}
            >
              {RISK_LEVELS[level].label}
            </span>
          ) : (
            <span className="font-mono text-[10.5px] uppercase text-subtle">N/A</span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted">{hazard.headline}</span>
      </span>
      <span className="display-metric shrink-0 text-[24px] text-ink">{hazard.available ? score : '–'}</span>
      <ChevronRight className="size-4 shrink-0 text-line-strong transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  );
}

export function FactorBreakdown({ hazard }: { hazard: HazardScore }) {
  const color = RISK_LEVELS[hazard.level].color;
  return (
    <div className="space-y-3">
      {hazard.factors.map((f) => (
        <div key={f.key}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-medium text-ink">{f.label}</span>
            <Tip
              content={`Bobot nominal ${Math.round(f.weight * 100)}%${f.available ? `, efektif ${Math.round(f.effectiveWeight * 100)}%` : ' — dialihkan karena data tidak tersedia'}. Sumber: ${f.source}`}
            >
              <span tabIndex={0} className="shrink-0 font-mono text-[11px] font-medium text-muted tabular">
                {f.available ? `+${f.contribution.toFixed(1)} poin` : 'tidak tersedia'} ·{' '}
                {Math.round(f.weight * 100)}%
              </span>
            </Tip>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
              {f.available ? (
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${Math.max(2, f.normalized ?? 0)}%`,
                    background: color,
                    opacity: 0.35 + (f.normalized ?? 0) / 160,
                  }}
                />
              ) : (
                <div className="h-full w-full bg-[repeating-linear-gradient(135deg,#E6E5E1,#E6E5E1_4px,transparent_4px,transparent_8px)]" />
              )}
            </div>
            <span
              className="w-28 shrink-0 truncate text-right text-[11.5px] text-muted"
              title={f.displayValue}
            >
              {f.displayValue}
            </span>
          </div>
        </div>
      ))}
      {hazard.note && (
        <p className="rounded-lg bg-neutral-50 px-3 py-2 text-[12px] text-muted">{hazard.note}</p>
      )}
      <p className="text-[11.5px] text-muted">
        Cakupan data {Math.round(hazard.coverage * 100)}% · keyakinan{' '}
        {hazard.confidence === 'high' ? 'tinggi' : hazard.confidence === 'medium' ? 'sedang' : 'rendah'}
      </p>
    </div>
  );
}

const STEPS = [
  { key: 'weather', label: 'Memeriksa cuaca (BMKG & Open-Meteo)' },
  { key: 'hotspots', label: 'Memeriksa titik panas sekitar (NASA FIRMS)' },
  { key: 'air', label: 'Mengevaluasi kualitas udara & paparan' },
  { key: 'personal', label: 'Mempersonalisasi rekomendasi' },
];

/** Polished analysis sequence tied to the real loading state of each source. */
export function AnalysisSequence({
  sources,
  ready,
  locationName,
  onDone,
}: {
  sources: { key: string; state: SourceState }[];
  ready: boolean;
  locationName: string;
  onDone: () => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 380);
    return () => clearInterval(id);
  }, []);
  const stateOf = (key: string, i: number): SourceState | 'pending' => {
    if (tick < i * 2 + 1) return 'pending';
    if (key === 'personal') return ready && tick >= 8 ? 'success' : 'loading';
    return sources.find((s) => s.key === key)?.state ?? 'success';
  };
  const done = ready && tick >= 9;
  useEffect(() => {
    if (done) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
  }, [done, onDone]);
  return (
    <Card className="relative overflow-hidden p-6 sm:p-10" role="status" aria-live="polite">
      <div className="bg-topo absolute inset-0 opacity-[0.05]" aria-hidden />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-8 sm:flex-row sm:items-center">
        <Ara pose="thinking" size={170} float priority />
        <div className="w-full flex-1">
          <p className="telemetry !text-brand">Siaga Risk Engine</p>
          <h2 className="mt-1.5 text-[24px] font-bold tracking-[-0.025em]">Menganalisis {locationName}…</h2>
          <ol className="mt-6 space-y-3.5">
            {STEPS.map((s, i) => {
              const st = stateOf(s.key, i);
              return (
                <li
                  key={s.key}
                  className={cn(
                    'flex items-center gap-3.5 text-[14px] transition-opacity duration-300',
                    st === 'pending' ? 'opacity-35' : 'opacity-100',
                  )}
                >
                  <span className="w-5 font-mono text-[11px] font-semibold text-subtle">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full',
                      st === 'success'
                        ? 'bg-[#EEF7F2] text-risk-safe'
                        : st === 'error'
                          ? 'bg-[#FDF6E8] text-[#8A5A0B]'
                          : 'bg-neutral-100 text-muted',
                    )}
                  >
                    {st === 'success' ? (
                      <Check className="size-3.5" strokeWidth={2.6} />
                    ) : st === 'error' ? (
                      <X className="size-3.5" />
                    ) : st === 'loading' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CircleDashed className="size-3.5" />
                    )}
                  </span>
                  <span className="font-medium">{s.label}</span>
                  {st === 'error' && (
                    <span className="font-mono text-[10.5px] uppercase text-[#8A5A0B]">tidak tersedia</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Card>
  );
}

const KIND: Record<string, string> = { hotspots: 'hotspots', river: 'river' };

export function SourcesPanel({
  sources,
}: {
  sources: { key: string; label: string; state: SourceState; provenance?: Provenance }[];
}) {
  return (
    <ul className="divide-y divide-line">
      {sources.map((s) => (
        <li key={s.key} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink">{s.label}</p>
            <p className="truncate text-[12px] text-muted">
              {s.provenance?.source ?? (s.state === 'loading' ? 'Memuat…' : 'Sumber tidak tersedia saat ini')}
            </p>
          </div>
          {s.state === 'loading' ? (
            <Loader2 className="size-4 animate-spin text-muted" />
          ) : (
            <FreshnessBadge provenance={s.state === 'error' ? undefined : s.provenance} kind={KIND[s.key]} />
          )}
        </li>
      ))}
    </ul>
  );
}
