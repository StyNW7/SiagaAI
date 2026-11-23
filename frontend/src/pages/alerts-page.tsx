import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Info,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState, FreshnessBadge } from '@/components/common/data-state';
import { PageHeader } from '@/components/common/layout-bits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { ALERT_LEVELS, alertReadKey, useAlerts } from '@/features/alerts/use-alerts';
import { useDocumentTitle } from '@/hooks/use-misc';
import { formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AlertLevel, AlertOrigin } from '@/types/domain';
import { t } from '@/lib/i18n';
import { useAlertReadStore } from '@/stores';

const ICON: Record<AlertLevel, typeof Info> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  advisory: AlertTriangle,
  info: Info,
};

export default function AlertsPage() {
  useDocumentTitle(t('Pusat Peringatan', 'Alert Center'));
  const { alerts, counts, unreadCounts, unreadTotal, isRead, view } = useAlerts();
  const markRead = useAlertReadStore((s) => s.markRead);
  const markUnread = useAlertReadStore((s) => s.markUnread);
  const [origin, setOrigin] = useState<'all' | AlertOrigin>('all');
  const [level, setLevel] = useState<'all' | AlertLevel>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const list = alerts.filter(
    (a) =>
      (origin === 'all' || a.origin === origin) &&
      (level === 'all' || a.level === level) &&
      (!unreadOnly || !isRead(a)),
  );
  const unreadInList = list.filter((a) => !isRead(a));

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Bell className="size-3.5" /> Alert Center
          </span>
        }
        title={t('Pusat peringatan', 'Alert center')}
        description={t(
          'Peringatan resmi BMKG + sinyal indikatif SiagaAI untuk lokasimu.',
          'Official BMKG warnings + SiagaAI indicative signals for your location.',
        )}
        mascot="alert"
        actions={
          <dl className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="flex items-center gap-2">
              <dt className="telemetry">{t('Cuaca', 'Weather')}</dt>
              <dd>
                <FreshnessBadge provenance={view.warnings.data?.provenance} />
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="telemetry">{t('Gempa', 'Quakes')}</dt>
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
                'relative flex flex-col gap-3 bg-surface p-5 text-left transition-colors hover:bg-raised',
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
              <span className="flex items-end justify-between gap-2">
                <span className="display-metric text-[36px]">{counts[l]}</span>
                {unreadCounts[l] > 0 && (
                  <span
                    className="mb-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]"
                    style={{ background: m.soft, color: m.text }}
                  >
                    {t(`${unreadCounts[l]} baru`, `${unreadCounts[l]} new`)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={origin}
          onValueChange={(v) => setOrigin(v as typeof origin)}
          className="max-w-full overflow-x-auto scrollbar-none"
        >
          <TabsList>
            <TabsTrigger value="all">{t('Semua', 'All')}</TabsTrigger>
            <TabsTrigger value="official">{t('Resmi (BMKG)', 'Official (BMKG)')}</TabsTrigger>
            <TabsTrigger value="siaga">{t('Indikatif SiagaAI', 'SiagaAI indicative')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          aria-pressed={unreadOnly}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
            unreadOnly
              ? 'border-brand/30 bg-brand-soft text-brand-dark'
              : 'border-line bg-surface text-neutral-600 hover:border-line-strong hover:text-ink',
          )}
        >
          <span className={cn('size-2 rounded-full', unreadTotal ? 'bg-brand' : 'bg-neutral-300')} aria-hidden />
          {t('Belum dibaca', 'Unread')}
          <span className="font-mono text-[11px] tabular">{unreadTotal}</span>
        </button>
        <div className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full"
          disabled={unreadInList.length === 0}
          onClick={() => markRead(unreadInList.map(alertReadKey))}
        >
          <CheckCheck /> {t('Tandai semua dibaca', 'Mark all as read')}
        </Button>
      </div>

      {view.warnings.state === 'error' && (
        <ErrorState
          className="mb-4"
          title={t('Peringatan dini BMKG sementara tidak dapat dimuat', 'BMKG early warnings temporarily could not be loaded')}
          description={t(
            'Informasi gempa & sinyal indikatif tetap ditampilkan. Periksa langsung bmkg.go.id untuk peringatan terkini.',
            'Earthquake info & indicative signals are still shown. Check bmkg.go.id directly for the latest warnings.',
          )}
        />
      )}

      {list.length === 0 ? (
        <EmptyState
          pose={unreadOnly ? 'success' : 'rest'}
          title={
            unreadOnly
              ? t('Semua peringatan sudah dibaca', 'All caught up')
              : t('Tidak ada peringatan di filter ini', 'No alerts in this filter')
          }
          description={
            unreadOnly
              ? t(
                  'Tidak ada notifikasi baru. Ara akan memberi tanda jika ada peringatan baru.',
                  'No new notifications. Ara will flag any new alert for you.',
                )
              : t(
                  'Kondisi relatif tenang. Ara terus memantau sumber resmi.',
                  'Conditions are relatively calm. Ara keeps monitoring official sources.',
                )
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const m = ALERT_LEVELS[a.level];
            const Icon = ICON[a.level];
            const open = expanded === a.id;
            const read = isRead(a);
            const key = alertReadKey(a);
            return (
              <li key={a.id}>
                {/* Interacting with an alert (tapping it, expanding it, opening its source) marks it read. */}
                <Card
                  className={cn(
                    'overflow-hidden transition-colors',
                    read ? 'bg-raised/60' : 'border-line-strong ring-1 ring-brand/10',
                  )}
                  onClick={() => !read && markRead([key])}
                >
                  <div className="flex">
                    <div
                      className={cn('w-[3px] shrink-0', read && 'opacity-40')}
                      style={{ background: m.color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        {!read && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white">
                            <span className="size-1.5 rounded-full bg-white" aria-hidden />
                            {t('Baru', 'New')}
                          </span>
                        )}
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em]"
                          style={{ background: m.soft, color: m.text }}
                        >
                          <Icon className="size-3" /> {m.label}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]',
                            a.origin === 'official' ? 'bg-inverse text-on-inverse' : 'bg-ai-soft text-ai-deep',
                          )}
                        >
                          {a.origin === 'official' ? t('Resmi', 'Official') : t('✦ Indikatif', '✦ Indicative')}
                        </span>
                        <span className="text-[12.5px] font-medium text-muted">{a.category}</span>
                      </div>
                      <h3
                        className={cn(
                          'mt-2.5 text-[16px] leading-snug tracking-[-0.01em]',
                          read ? 'font-semibold text-neutral-700' : 'font-bold text-ink',
                        )}
                      >
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
                            {open ? t('Ringkas', 'Show less') : t('Selengkapnya', 'Read more')}
                          </button>
                        )}
                        <button
                          className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (read) markUnread(key);
                            else markRead([key]);
                          }}
                        >
                          {read ? (
                            <>
                              <RotateCcw className="size-3.5" /> {t('Tandai belum dibaca', 'Mark as unread')}
                            </>
                          ) : (
                            <>
                              <Check className="size-3.5" /> {t('Tandai dibaca', 'Mark as read')}
                            </>
                          )}
                        </button>
                        {a.sourceUrl && (
                          <a
                            href={a.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                          >
                            {t('Sumber resmi', 'Official source')} <ExternalLink className="size-3" />
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
