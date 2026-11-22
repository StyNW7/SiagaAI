import {
  AlertCircle,
  CloudOff,
  Database,
  FlaskConical,
  Loader2,
  RefreshCw,
  SatelliteDish,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useNow } from '@/hooks/use-misc';
import { formatTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DataMode, FreshnessStatus, Provenance } from '@/types/domain';
import { Button } from '../ui/button';
import { Tip } from '../ui/overlays';

/** Freshness thresholds (hours) per data family. */
const THRESHOLDS: Record<string, [number, number]> = { default: [1, 6], hotspots: [6, 24], river: [12, 48] };

export function freshnessOf(p: Provenance | undefined, kind = 'default', now = Date.now()): FreshnessStatus {
  if (!p) return 'unavailable';
  const ref = p.mode === 'live' ? p.fetchedAt : (p.issuedAt ?? p.fetchedAt);
  const ageH = (now - new Date(ref).getTime()) / 3_600_000;
  const [fresh, aging] = THRESHOLDS[kind] ?? THRESHOLDS.default;
  if (p.mode === 'snapshot' || p.mode === 'cached') return ageH < aging ? 'aging' : 'stale';
  return ageH < fresh ? 'fresh' : ageH < aging ? 'aging' : 'stale';
}

const FRESH_META: Record<FreshnessStatus, { label: string; dot: string; text: string }> = {
  fresh: { label: 'Terkini', dot: 'bg-green-500', text: 'text-green-700' },
  aging: { label: 'Menua', dot: 'bg-amber-500', text: 'text-amber-700' },
  stale: { label: 'Usang', dot: 'bg-orange-600', text: 'text-orange-700' },
  unavailable: { label: 'Tidak tersedia', dot: 'bg-neutral-300', text: 'text-neutral-500' },
};

const MODE_META: Record<DataMode, { label: string; icon: typeof Database }> = {
  live: { label: 'Live', icon: SatelliteDish },
  snapshot: { label: 'Snapshot', icon: Database },
  scenario: { label: 'Simulasi', icon: FlaskConical },
  cached: { label: 'Offline', icon: CloudOff },
};

export function FreshnessBadge({
  provenance,
  kind,
  className,
  showSource,
}: {
  provenance?: Provenance;
  kind?: string;
  className?: string;
  showSource?: boolean;
}) {
  const now = useNow();
  const status = freshnessOf(provenance, kind, now);
  const meta = FRESH_META[status];
  const mode = provenance ? MODE_META[provenance.mode] : null;
  const when = provenance
    ? provenance.mode === 'live'
      ? provenance.fetchedAt
      : (provenance.issuedAt ?? provenance.fetchedAt)
    : null;
  return (
    <Tip
      content={
        provenance ? (
          <span>
            <b>{provenance.source}</b>
            <br />
            {provenance.issuedAt && <>Diterbitkan {formatTime(provenance.issuedAt)} · </>}Diambil{' '}
            {formatTime(provenance.fetchedAt)}
          </span>
        ) : (
          'Sumber data tidak tersedia saat ini'
        )
      }
    >
      <span
        tabIndex={0}
        className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium text-muted', className)}
      >
        <span
          className={cn('size-1.5 rounded-full', meta.dot, status === 'fresh' && 'animate-pulse')}
          aria-hidden
        />
        {mode && provenance?.mode !== 'live' && (
          <span className="inline-flex items-center gap-0.5 font-semibold text-neutral-700">
            <mode.icon className="size-3" aria-hidden />
            {mode.label} ·
          </span>
        )}
        <span className={meta.text}>
          {when ? (status === 'unavailable' ? meta.label : timeAgo(when, now)) : meta.label}
        </span>
        {showSource && provenance && (
          <span className="hidden truncate sm:inline">· {provenance.source.split('—')[0].trim()}</span>
        )}
      </span>
    </Tip>
  );
}

export function LoadingState({ label = 'Memuat data…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center gap-2 py-6 text-sm text-muted', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertCircle className="size-4" aria-hidden />
        {title}
      </div>
      {description && <p className="text-[13px] leading-relaxed text-amber-900/80">{description}</p>}
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          <RefreshCw /> Coba lagi
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center overflow-hidden rounded-2xl border border-dashed border-line bg-neutral-50/60 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="bg-batik absolute inset-0 opacity-[0.035]" aria-hidden />
      <div className="relative mb-3 grid size-12 place-items-center rounded-2xl bg-white text-muted shadow-soft">
        {icon}
      </div>
      <h3 className="relative text-[15px] font-semibold text-ink">{title}</h3>
      {description && (
        <p className="relative mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="relative mt-4">{action}</div>}
    </div>
  );
}
