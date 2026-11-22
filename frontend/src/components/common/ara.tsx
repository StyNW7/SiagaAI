import type { ReactNode } from 'react';
import type { HazardType, RiskLevel } from '@/features/risk/engine/types';
import { cn } from '@/lib/utils';

/**
 * Ara — SIAGA Ranger, the SiagaAI mascot.
 * A calm, kind multi-disaster responder who guides users through each state of the product.
 * Assets are transparent WebP cut-outs from the official Ara sticker sheets (see /mascot).
 */
export type AraPose =
  | 'wave'
  | 'map'
  | 'tablet'
  | 'explain'
  | 'alert'
  | 'checklist'
  | 'success'
  | 'warning'
  | 'thinking'
  | 'radio'
  | 'explore'
  | 'run'
  | 'kit'
  | 'flood'
  | 'smoke'
  | 'weather'
  | 'family'
  | 'rest'
  | 'hero-wave'
  | 'hero-ready'
  | 'hero-explain';

/** Intrinsic aspect ratios (w / h) so layout never shifts while the image loads. */
const RATIO: Record<AraPose, number> = {
  wave: 242 / 322,
  map: 212 / 320,
  tablet: 176 / 322,
  explain: 227 / 321,
  alert: 206 / 323,
  checklist: 217 / 322,
  success: 206 / 318,
  warning: 190 / 315,
  thinking: 202 / 315,
  radio: 213 / 316,
  explore: 204 / 316,
  run: 211 / 318,
  kit: 163 / 315,
  flood: 199 / 311,
  smoke: 168 / 313,
  weather: 267 / 315,
  family: 293 / 279,
  rest: 216 / 298,
  'hero-wave': 384 / 640,
  'hero-ready': 340 / 640,
  'hero-explain': 352 / 640,
};

const ALT: Partial<Record<AraPose, string>> = {
  wave: 'Ara menyapa',
  success: 'Ara memberi jempol',
  rest: 'Ara beristirahat — kondisi aman',
  family: 'Ara membantu keluarga',
};

export function Ara({
  pose,
  size = 140,
  className,
  float,
  priority,
  alt,
}: {
  pose: AraPose;
  /** Rendered height in px. */
  size?: number;
  className?: string;
  /** Gentle idle float animation. */
  float?: boolean;
  /** Eager-load (above-the-fold). */
  priority?: boolean;
  /** Pass a string to make the image meaningful; decorative by default. */
  alt?: string;
}) {
  const ratio = RATIO[pose];
  return (
    <img
      src={`/mascot/ara-${pose}.webp`}
      alt={alt ?? ''}
      aria-hidden={alt ? undefined : true}
      title={alt ?? ALT[pose]}
      width={Math.round(size * ratio)}
      height={size}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn(
        'pointer-events-none shrink-0 select-none object-contain drop-shadow-[0_10px_18px_rgb(23_23_23/0.12)]',
        float && 'animate-float',
        className,
      )}
      style={{ height: size, width: Math.round(size * ratio) }}
    />
  );
}

/** Ara + a short speech bubble. Keep copy to one or two lines. */
export function AraSays({
  pose,
  children,
  title,
  size = 96,
  className,
  tone = 'neutral',
  action,
  align = 'left',
}: {
  pose: AraPose;
  children?: ReactNode;
  title?: ReactNode;
  size?: number;
  className?: string;
  tone?: 'neutral' | 'brand' | 'ai' | 'calm';
  action?: ReactNode;
  align?: 'left' | 'right';
}) {
  const toneCls = {
    neutral: 'bg-white border-line',
    brand: 'bg-brand-pale border-brand/15',
    ai: 'bg-ai-soft/70 border-ai/15',
    calm: 'bg-[#EEF7F2] border-[#208A61]/15',
  }[tone];
  return (
    <div className={cn('flex items-end gap-3', align === 'right' && 'flex-row-reverse', className)}>
      <Ara pose={pose} size={size} />
      <div
        className={cn(
          'relative mb-3 min-w-0 flex-1 rounded-2xl border px-4 py-3 shadow-soft',
          align === 'left' ? 'rounded-bl-md' : 'rounded-br-md',
          toneCls,
        )}
      >
        {title && <p className="text-[14px] font-bold leading-snug text-ink">{title}</p>}
        {children && (
          <div className={cn('text-[13px] leading-relaxed text-neutral-600', title && 'mt-0.5')}>
            {children}
          </div>
        )}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}

/** Which Ara pose best mirrors a risk category. */
export function poseForLevel(level: RiskLevel): AraPose {
  switch (level) {
    case 'safe':
      return 'success';
    case 'low':
      return 'tablet';
    case 'moderate':
      return 'explain';
    case 'high':
      return 'warning';
    case 'critical':
      return 'alert';
  }
}

export function poseForHazard(hazard: HazardType): AraPose {
  switch (hazard) {
    case 'flood':
      return 'flood';
    case 'smoke':
      return 'smoke';
    case 'weather':
      return 'weather';
    case 'fire':
      return 'alert';
  }
}

/** Short, calm line Ara says for a given level (Bahasa Indonesia). */
export const ARA_LINES: Record<RiskLevel, string> = {
  safe: 'Kondisi relatif aman. Tetap pantau info resmi, ya!',
  low: 'Ada sinyal ringan. Aktivitas normal, tetap waspada.',
  moderate: 'Perlu waspada. Yuk siapkan rencana sederhana.',
  high: 'Risiko tinggi. Sesuaikan aktivitasmu hari ini.',
  critical: 'Utamakan keselamatan & ikuti arahan petugas.',
};
