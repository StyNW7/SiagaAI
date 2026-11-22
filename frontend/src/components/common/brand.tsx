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

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[17px] font-extrabold tracking-tight text-ink">
            Siaga<span className="text-brand">AI</span>
          </span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
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

/** Subtle batik + topographic backdrop (2–6 % opacity). */
export function NusantaraBackdrop({
  className,
  batik = true,
  topo = true,
}: {
  className?: string;
  batik?: boolean;
  topo?: boolean;
}) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {topo && <div className="bg-topo absolute inset-0 opacity-[0.05]" />}
      {batik && (
        <div className="bg-batik absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
      )}
    </div>
  );
}

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
