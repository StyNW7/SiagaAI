import {
  AlertOctagon,
  AlertTriangle,
  CloudLightning,
  Flame,
  Info,
  ShieldCheck,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { HazardType, RiskLevel } from '@/features/risk/engine/types';
import { useCountUp } from '@/hooks/use-misc';
import { HAZARDS, RISK_LEVELS } from '@/lib/risk-levels';
import { cn } from '@/lib/utils';

export const HAZARD_ICONS: Record<HazardType, LucideIcon> = {
  flood: Waves,
  fire: Flame,
  smoke: Wind,
  weather: CloudLightning,
};

export const LEVEL_ICONS: Record<RiskLevel, LucideIcon> = {
  safe: ShieldCheck,
  low: Info,
  moderate: AlertTriangle,
  high: AlertTriangle,
  critical: AlertOctagon,
};

/** Risk is always communicated with colour + icon + text (never colour alone). */
export function RiskBadge({
  level,
  className,
  size = 'sm',
  label,
}: {
  level: RiskLevel;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const m = RISK_LEVELS[level];
  const Icon = LEVEL_ICONS[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold tracking-wide',
        size === 'sm' && 'px-2 py-0.5 text-[10.5px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        className,
      )}
      style={{ background: m.soft, color: m.text, boxShadow: `inset 0 0 0 1px ${m.color}33` }}
    >
      <Icon className={cn(size === 'lg' ? 'size-4' : 'size-3')} aria-hidden />
      {label ?? m.short}
    </span>
  );
}

export function HazardIcon({
  hazard,
  level,
  className,
  size = 'md',
}: {
  hazard: HazardType;
  level?: RiskLevel;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const Icon = HAZARD_ICONS[hazard];
  const m = level ? RISK_LEVELS[level] : null;
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-xl',
        size === 'sm' ? 'size-8' : size === 'md' ? 'size-10' : 'size-12',
        className,
      )}
      style={{ background: m?.soft ?? '#F4F4F5', color: m?.color ?? '#52525B' }}
      aria-label={HAZARDS[hazard].label}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-5'} aria-hidden />
    </span>
  );
}

/** Animated semicircle gauge for the Siaga Score. */
export function ScoreGauge({
  score,
  level,
  size = 220,
  label = 'Siaga Score',
  sublabel,
}: {
  score: number;
  level: RiskLevel;
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const value = useCountUp(score);
  const m = RISK_LEVELS[level];
  const r = 84;
  const circ = Math.PI * r;
  const segments: RiskLevel[] = ['safe', 'low', 'moderate', 'high', 'critical'];
  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size * 0.62 }}
      role="img"
      aria-label={`${label}: ${score} dari 100, kategori ${m.label}`}
    >
      <svg viewBox="0 0 200 124" className="h-full w-full overflow-visible">
        {segments.map((s, i) => {
          const len = circ / 5;
          return (
            <path
              key={s}
              d="M 16 108 A 84 84 0 0 1 184 108"
              fill="none"
              stroke={RISK_LEVELS[s].color}
              strokeOpacity={0.16}
              strokeWidth={14}
              strokeDasharray={`${len - 2} ${circ}`}
              strokeDashoffset={-i * len}
            />
          );
        })}
        <path
          d="M 16 108 A 84 84 0 0 1 184 108"
          fill="none"
          stroke={m.color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * circ} ${circ}`}
          style={{ transition: 'stroke 0.4s' }}
        />
        {(() => {
          const a = Math.PI * (1 - value / 100);
          const x = 100 + r * Math.cos(a);
          const y = 108 - r * Math.sin(a);
          return <circle cx={x} cy={y} r={9} fill="#fff" stroke={m.color} strokeWidth={4} />;
        })()}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="tabular text-[44px] font-extrabold leading-none tracking-tight text-ink">
          {value}
          <span className="text-lg font-semibold text-muted">/100</span>
        </div>
        {sublabel && <div className="mt-1 text-[11px] font-medium text-muted">{sublabel}</div>}
      </div>
    </div>
  );
}

export function ScoreBar({
  score,
  level,
  className,
}: {
  score: number;
  level: RiskLevel;
  className?: string;
}) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-neutral-100', className)} aria-hidden>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(3, score)}%`, background: RISK_LEVELS[level].color }}
      />
    </div>
  );
}

export function RiskScaleLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted', className)}>
      {(['safe', 'low', 'moderate', 'high', 'critical'] as RiskLevel[]).map((l) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: RISK_LEVELS[l].color }} />
          <span className="font-semibold text-neutral-700">{RISK_LEVELS[l].label}</span>{' '}
          {RISK_LEVELS[l].range.join('–')}
        </span>
      ))}
    </div>
  );
}
