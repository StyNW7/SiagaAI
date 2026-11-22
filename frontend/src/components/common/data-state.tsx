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
import { localizeSource, t } from '@/lib/i18n';
import type { DataMode, FreshnessStatus, Provenance } from '@/types/domain';
import { Button } from '../ui/button';
import { Tip } from '../ui/overlays';
import { Ara, type AraPose } from './ara';

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

const FRESH_META: Record<FreshnessStatus, { readonly label: string; dot: string; text: string }> = {
  fresh: {
    get label() {
      return t('Terkini', 'Fresh');
    },
    dot: 'bg-risk-safe',
    text: 'text-[var(--risk-safe-text)]',
  },
  aging: {
    get label() {
      return t('Menua', 'Aging');
    },
    dot: 'bg-risk-moderate',
    text: 'text-[var(--risk-moderate-text)]',
  },
  stale: {
    get label() {
      return t('Usang', 'Stale');
    },
    dot: 'bg-risk-high',
    text: 'text-[var(--risk-high-text)]',
  },
  unavailable: {
    get label() {
      return t('Tidak tersedia', 'Unavailable');
    },
    dot: 'bg-neutral-300',
    text: 'text-neutral-500',
  },
};

const MODE_META: Record<DataMode, { readonly label: string; icon: typeof Database }> = {
  live: { label: 'Live', icon: SatelliteDish },
  snapshot: { label: 'Snapshot', icon: Database },
  scenario: {
    get label() {
      return t('Simulasi', 'Simulation');
    },
    icon: FlaskConical,
  },
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
            <b>{localizeSource(provenance.source)}</b>
            <br />
            {provenance.issuedAt && (
              <>
                {t('Diterbitkan', 'Issued')} {formatTime(provenance.issuedAt)} ·{' '}
              </>
            )}
            {t('Diambil', 'Fetched')} {formatTime(provenance.fetchedAt)}
          </span>
        ) : (
          t('Sumber data tidak tersedia saat ini', 'Data source is currently unavailable')
        )
      }
    >
      <span
        tabIndex={0}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted',
          className,
        )}
      >
        <span
          className={cn('size-1.5 shrink-0 rounded-full', meta.dot, status === 'fresh' && 'animate-pulse')}
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
          <span className="hidden truncate sm:inline">
            · {localizeSource(provenance.source).split('—')[0].trim()}
          </span>
        )}
      </span>
    </Tip>
  );
}

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center gap-2.5 py-6 text-[13px] text-muted', className)}>
      <span className="relative grid size-4 place-items-center" aria-hidden>
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/25" />
        <span className="size-2 rounded-full bg-brand" />
      </span>
      {label ?? t('Memuat data…', 'Loading data…')}
    </div>
  );
}

/** Branded full-area loader with Ara — for route-level suspense. */
export function PageLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-4 py-24', className)}>
      <Ara pose="radio" size={110} float priority />
      <div className="flex items-center gap-2.5">
        <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
        <span className="telemetry">{label ?? t('Memuat SiagaAI…', 'Loading SiagaAI…')}</span>
      </div>
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
        'flex flex-col items-start gap-2 rounded-xl border border-risk-moderate/30 bg-[var(--risk-moderate-soft)]/70 p-4',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--risk-moderate-text)]">
        <AlertCircle className="size-4" aria-hidden />
        {title}
      </div>
      {description && (
        <p className="text-[13px] leading-relaxed text-[var(--risk-moderate-text)]/80">{description}</p>
      )}
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="mt-1">
          <RefreshCw /> {t('Coba lagi', 'Try again')}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  pose,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  /** Show Ara instead of an icon. */
  pose?: AraPose;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center overflow-hidden rounded-[14px] border border-dashed border-line-strong bg-raised px-6 py-10 text-center',
        className,
      )}
    >
      <div className="bg-topo absolute inset-0 opacity-[0.045]" aria-hidden />
      {pose ? (
        <Ara pose={pose} size={120} className="relative mb-3" />
      ) : (
        icon && (
          <div className="relative mb-3 grid size-12 place-items-center rounded-full border border-line bg-surface text-muted">
            {icon}
          </div>
        )
      )}
      <h3 className="relative text-[16px] font-bold text-ink">{title}</h3>
      {description && (
        <p className="text-pretty relative mt-1 max-w-sm text-[13.5px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
