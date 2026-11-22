import { Check, CircleDashed, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FreshnessBadge } from '@/components/common/data-state';
import { HazardIcon, RiskBadge, ScoreBar } from '@/components/common/risk';
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
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        'group flex h-full flex-col rounded-card border bg-white p-4 text-left shadow-soft transition-all',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lift',
        active ? 'border-ink ring-1 ring-ink' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <HazardIcon hazard={hazard.hazard} level={hazard.available ? level : undefined} />
        {hazard.available ? (
          <RiskBadge level={level} />
        ) : (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] font-bold text-neutral-500">
            N/A
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-ink">{meta.label}</h3>
        <span className="tabular text-[22px] font-bold leading-none text-ink">
          {hazard.available ? score : '–'}
          <span className="text-[11px] font-medium text-muted">/100</span>
        </span>
      </div>
      <ScoreBar score={hazard.available ? score : 0} level={level} className="mt-2" />
      <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{hazard.headline}</p>
      {hazard.available && hazard.confidence !== 'high' && (
        <p className="mt-auto pt-2 text-[11px] font-medium text-amber-700">
          Keyakinan {hazard.confidence === 'medium' ? 'sedang' : 'rendah'} · sebagian data tidak tersedia
        </p>
      )}
    </Comp>
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
              <span tabIndex={0} className="shrink-0 text-[11px] font-semibold text-muted tabular">
                {f.available ? `+${f.contribution.toFixed(1)} poin` : 'tidak tersedia'} ·{' '}
                {Math.round(f.weight * 100)}%
              </span>
            </Tip>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
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
                <div className="h-full w-full bg-[repeating-linear-gradient(135deg,#E5E7EB,#E5E7EB_4px,transparent_4px,transparent_8px)]" />
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
    <Card className="relative overflow-hidden p-6 sm:p-8" role="status" aria-live="polite">
      <div className="bg-topo absolute inset-0 opacity-[0.05]" aria-hidden />
      <div className="relative mx-auto max-w-md">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-brand">Siaga Risk Engine</p>
        <h2 className="mt-1 text-xl font-bold">Menganalisis {locationName}…</h2>
        <ul className="mt-5 space-y-3">
          {STEPS.map((s, i) => {
            const st = stateOf(s.key, i);
            return (
              <li
                key={s.key}
                className={cn(
                  'flex items-center gap-3 text-[14px] transition-opacity',
                  st === 'pending' ? 'opacity-40' : 'opacity-100',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full',
                    st === 'success'
                      ? 'bg-green-100 text-green-700'
                      : st === 'error'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-neutral-100 text-muted',
                  )}
                >
                  {st === 'success' ? (
                    <Check className="size-3.5" />
                  ) : st === 'error' ? (
                    <X className="size-3.5" />
                  ) : st === 'loading' ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CircleDashed className="size-3.5" />
                  )}
                </span>
                <span className="font-medium">{s.label}</span>
                {st === 'error' && <span className="text-[12px] text-amber-700">tidak tersedia</span>}
              </li>
            );
          })}
        </ul>
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
        <li key={s.key} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">{s.label}</p>
            <p className="truncate text-[11.5px] text-muted">
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
