import { AlertOctagon, AlertTriangle, Bell, Clock, ExternalLink, Info, MapPin } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState, FreshnessBadge } from '@/components/common/data-state';
import { PageHeader } from '@/components/common/layout-bits';
import { Card } from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { ALERT_LEVELS, useAlerts } from '@/features/alerts/use-alerts';
import { useDocumentTitle } from '@/hooks/use-misc';
import { formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AlertLevel, AlertOrigin } from '@/types/domain';

const ICON: Record<AlertLevel, typeof Info> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  advisory: AlertTriangle,
  info: Info,
};

export default function AlertsPage() {
  useDocumentTitle('Pusat Peringatan');
  const { alerts, counts, view } = useAlerts();
  const [origin, setOrigin] = useState<'all' | AlertOrigin>('all');
  const [level, setLevel] = useState<'all' | AlertLevel>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const list = alerts.filter(
    (a) => (origin === 'all' || a.origin === origin) && (level === 'all' || a.level === level),
  );

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Bell className="size-3.5" /> Alert Center
          </span>
        }
        title="Pusat peringatan"
        description="Peringatan resmi BMKG + sinyal indikatif SiagaAI untuk lokasimu."
        mascot="alert"
        actions={
          <dl className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="flex items-center gap-2">
              <dt className="telemetry">Cuaca</dt>
              <dd>
                <FreshnessBadge provenance={view.warnings.data?.provenance} />
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="telemetry">Gempa</dt>
              <dd>
                <FreshnessBadge provenance={view.earthquakes.data?.provenance} />
              </dd>
            </div>
          </dl>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-line bg-line shadow-soft sm:grid-cols-4">
        {(Object.keys(ALERT_LEVELS) as AlertLevel[]).map((l) => {
          const m = ALERT_LEVELS[l];
          const Icon = ICON[l];
          return (
            <button
              key={l}
              onClick={() => setLevel(level === l ? 'all' : l)}
              aria-pressed={level === l}
              className={cn(
                'relative flex flex-col gap-3 bg-white p-5 text-left transition-colors hover:bg-raised',
                level === l && 'bg-raised',
              )}
            >
              {level === l && (
                <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: m.color }} />
              )}
              <span className="flex items-center gap-2 text-[13px] font-semibold text-neutral-700">
                <Icon className="size-4" style={{ color: m.color }} />
                {m.label}
              </span>
              <span className="display-metric text-[36px]">{counts[l]}</span>
            </button>
          );
        })}
      </div>

      <Tabs value={origin} onValueChange={(v) => setOrigin(v as typeof origin)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="official">Resmi (BMKG)</TabsTrigger>
          <TabsTrigger value="siaga">Indikatif SiagaAI</TabsTrigger>
        </TabsList>
      </Tabs>

      {view.warnings.state === 'error' && (
        <ErrorState
          className="mb-4"
          title="Peringatan dini BMKG sementara tidak dapat dimuat"
          description="Informasi gempa & sinyal indikatif tetap ditampilkan. Periksa langsung bmkg.go.id untuk peringatan terkini."
        />
      )}

      {list.length === 0 ? (
        <EmptyState
          pose="rest"
          title="Tidak ada peringatan di filter ini"
          description="Kondisi relatif tenang. Ara terus memantau sumber resmi."
        />
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const m = ALERT_LEVELS[a.level];
            const Icon = ICON[a.level];
            const open = expanded === a.id;
            return (
              <li key={a.id}>
                <Card className="overflow-hidden">
                  <div className="flex">
                    <div className="w-[3px] shrink-0" style={{ background: m.color }} aria-hidden />
                    <div className="min-w-0 flex-1 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em]"
                          style={{ background: m.soft, color: m.text }}
                        >
                          <Icon className="size-3" /> {m.label}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]',
                            a.origin === 'official' ? 'bg-ink text-white' : 'bg-ai-soft text-ai-deep',
                          )}
                        >
                          {a.origin === 'official' ? 'Resmi' : '✦ Indikatif'}
                        </span>
                        <span className="text-[12.5px] font-medium text-muted">{a.category}</span>
                      </div>
                      <h3 className="mt-2.5 text-[16px] font-bold leading-snug tracking-[-0.01em]">
                        {a.title}
                      </h3>
                      <p
                        className={cn(
                          'mt-1 whitespace-pre-line text-[13px] leading-relaxed text-neutral-600',
                          !open && 'line-clamp-2',
                        )}
                      >
                        {a.description}
                      </p>
                      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" /> {a.location}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 font-mono text-[11px]"
                          title={formatDateTime(a.time)}
                        >
                          <Clock className="size-3.5" /> {timeAgo(a.time)}
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-subtle">
                          {a.source}
                        </span>
                        <span className="flex-1" />
                        {a.description.length > 140 && (
                          <button
                            className="font-semibold text-ink hover:underline"
                            onClick={() => setExpanded(open ? null : a.id)}
                          >
                            {open ? 'Ringkas' : 'Selengkapnya'}
                          </button>
                        )}
                        {a.sourceUrl && (
                          <a
                            href={a.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                          >
                            Sumber resmi <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
