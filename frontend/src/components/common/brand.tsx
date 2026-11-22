import { INDONESIA_SILHOUETTE_PATH, SILHOUETTE_VIEWBOX } from '@/data/silhouette';
import { cn } from '@/lib/utils';

/** Official SiagaAI mark (images/SiagaAI-Logo.png → public/brand, transparent). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <picture className="contents">
      <source srcSet="/brand/siagaai-logo.webp" type="image/webp" />
      <img
        src="/brand/siagaai-logo-256.png"
        alt=""
        aria-hidden
        width={36}
        height={36}
        className={cn('size-10 shrink-0 object-contain', className)}
        draggable={false}
      />
    </picture>
  );
}

export function Logo({
  className,
  compact,
  inverted,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-9" />
      {!compact && (
        <span className="leading-none">
          <span
            className={cn(
              'block text-[18px] font-extrabold tracking-[-0.03em]',
              inverted ? 'text-white' : 'text-ink',
            )}
          >
            Siaga<span className={inverted ? 'text-white/70' : 'text-brand'}>AI</span>
          </span>
          <span
            className={cn(
              'mt-1 block font-mono text-[9px] font-medium uppercase tracking-[0.16em]',
              inverted ? 'text-white/60' : 'text-subtle',
            )}
          >
            Disaster Intelligence
          </span>
        </span>
      )}
    </span>
  );
}

/** Nusantara silhouette (from simplified BAKOSURTANAL boundaries). */
export function IndonesiaSilhouette({
  className,
  fill = 'currentColor',
  stroke,
  strokeWidth = 0,
}: {
  className?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${SILHOUETTE_VIEWBOX.width} ${SILHOUETTE_VIEWBOX.height}`}
      className={className}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={INDONESIA_SILHOUETTE_PATH}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Project lon/lat into silhouette viewBox coordinates. */
export function projectToSilhouette(lon: number, lat: number) {
  const v = SILHOUETTE_VIEWBOX;
  const sc = v.width / (v.maxLon - v.minLon);
  return { x: (lon - v.minLon) * sc, y: (v.maxLat - lat) * sc };
}

/**
 * NusantaraPattern — the single reusable motif layer (kawung geometry + contour lines).
 * Kept at 2–7 % opacity so identity is felt before it is noticed.
 */
export function NusantaraBackdrop({
  className,
  batik = true,
  topo = true,
  variant = 'light',
}: {
  className?: string;
  batik?: boolean;
  topo?: boolean;
  variant?: 'light' | 'red' | 'dark';
}) {
  const invert = variant !== 'light';
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {topo && (
        <div
          className={cn('bg-topo absolute inset-0', invert ? 'opacity-[0.045] invert' : 'opacity-[0.05]')}
        />
      )}
      {batik && (
        <div
          className={cn(
            'bg-batik absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]',
            invert ? 'opacity-[0.035] invert' : 'opacity-[0.035]',
          )}
        />
      )}
    </div>
  );
}
export const NusantaraPattern = NusantaraBackdrop;

/** Red–white ribbon accent. */
export function MerahPutih({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex h-1.5 w-10 overflow-hidden rounded-full ring-1 ring-line', className)}
    >
      <span className="h-full w-1/2 bg-brand" />
      <span className="h-full w-1/2 bg-white" />
    </span>
  );
}
