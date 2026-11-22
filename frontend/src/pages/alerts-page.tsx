import { AlertOctagon, AlertTriangle, Bell, ExternalLink, Info, ShieldCheck } from 'lucide-react';
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
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Bell className="size-3.5" /> Alert Center
          </span>
        }
        title="Pusat peringatan"
        description="Peringatan dini cuaca & informasi gempa resmi BMKG, ditambah sinyal indikatif SiagaAI untuk lokasi Anda. Selalu utamakan arahan resmi."
        actions={
          <div className="flex flex-col items-end gap-1">
            <FreshnessBadge provenance={view.warnings.data?.provenance} showSource />
            <FreshnessBadge provenance={view.earthquakes.data?.provenance} showSource />
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(ALERT_LEVELS) as AlertLevel[]).map((l) => {
          const m = ALERT_LEVELS[l];
          const Icon = ICON[l];
          return (
            <button
              key={l}
              onClick={() => setLevel(level === l ? 'all' : l)}
              aria-pressed={level === l}
              className={cn(
                'flex items-center gap-3 rounded-card border bg-white p-4 text-left shadow-soft transition-all hover:shadow-lift',
                level === l ? 'border-ink ring-1 ring-ink' : 'border-line',
              )}
            >
              <span
                className="grid size-10 place-items-center rounded-xl"
                style={{ background: m.soft, color: m.color }}
              >
                <Icon className="size-5" />
              </span>
              <span>
                <span className="tabular block text-[22px] font-bold leading-none">{counts[l]}</span>
                <span className="text-[12px] font-semibold text-muted">{m.label}</span>
              </span>
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
          icon={<ShieldCheck className="size-5" />}
          title="Tidak ada peringatan pada filter ini"
          description="Kondisi relatif tenang. SiagaAI terus memantau sumber resmi."
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
                    <div className="w-1.5 shrink-0" style={{ background: m.color }} aria-hidden />
                    <div className="min-w-0 flex-1 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                          style={{ background: m.soft, color: m.text }}
                        >
                          <Icon className="size-3" /> {m.label.toUpperCase()}
                        </span>
                        <span className="text-[12px] font-semibold text-neutral-700">{a.category}</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                            a.origin === 'official' ? 'bg-neutral-900 text-white' : 'bg-ai-soft text-ai',
                          )}
                        >
                          {a.origin === 'official' ? 'RESMI' : 'INDIKATIF'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold leading-snug">{a.title}</h3>
                      <p
                        className={cn(
                          'mt-1 whitespace-pre-line text-[13px] leading-relaxed text-neutral-600',
                          !open && 'line-clamp-2',
                        )}
                      >
                        {a.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                        <span>📍 {a.location}</span>
                        <span title={formatDateTime(a.time)}>🕑 {timeAgo(a.time)}</span>
                        <span>Sumber: {a.source}</span>
                        <span>Diperbarui {timeAgo(a.updatedAt)}</span>
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
