import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Flame, Minus, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { FreshnessBadge } from '@/components/common/data-state';
import { AiPanel, AiThinking, RichText, WeatherIcon } from '@/components/common/layout-bits';
import { HAZARD_ICONS, RiskBadge } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { PROVINCE_CAPITAL } from '@/data/cities';
import { DailyCountChart } from '@/features/charts/charts';
import { assessRisk, buildSignals } from '@/features/risk/engine';
import { useAiContext, useAiMutation } from '@/hooks/use-ai';
import { buildAiContext } from '@/services/ai/context';
import { HAZARD_ORDER, HAZARDS } from '@/lib/risk-levels';
import type { ProvinceHotspotStats } from '@/services/hazards/hotspots';
import { getAirQuality, getWeatherBundle } from '@/services/weather';
import { useLocationStore, useProfileStore, useSettings } from '@/stores';
import type { Hotspot, OfficialWarning } from '@/types/domain';
import { t } from '@/lib/i18n';
import { describeWeather } from '@/lib/weather-codes';

const trends = () => ({
  increasing: {
    label: t('Meningkat', 'Increasing'),
    icon: TrendingUp,
    cls: 'text-[var(--risk-critical-text)] bg-[var(--risk-critical-soft)]',
  },
  stable: { label: t('Stabil', 'Stable'), icon: Minus, cls: 'text-neutral-700 bg-neutral-100' },
  decreasing: {
    label: t('Menurun', 'Decreasing'),
    icon: TrendingDown,
    cls: 'text-[var(--risk-safe-text)] bg-[var(--risk-safe-soft)]',
  },
});

export function ProvincePanel({
  code,
  name,
  stats,
  warnings,
  hotspots,
  onClose,
}: {
  code: string;
  name: string;
  stats?: ProvinceHotspotStats;
  warnings: OfficialWarning[];
  hotspots: Hotspot[];
  onClose: () => void;
}) {
  const capital = PROVINCE_CAPITAL[code];
  const profile = useProfileStore((s) => s.profile);
  const setCurrent = useLocationStore((s) => s.setCurrent);
  const setScenario = useSettings((s) => s.setScenario);
  const navigate = useNavigate();

  const wx = useQuery({
    queryKey: ['weather', capital?.lat, capital?.lon],
    queryFn: ({ signal }) => getWeatherBundle(capital!, signal),
    enabled: !!capital,
    staleTime: 15 * 60_000,
  });
  const aq = useQuery({
    queryKey: ['air', capital?.lat, capital?.lon],
    queryFn: ({ signal }) => getAirQuality(capital!, signal),
    enabled: !!capital,
    staleTime: 30 * 60_000,
    retry: 1,
  });

  const assessment = useMemo(() => {
    if (!capital || wx.isPending) return null;
    const signals = buildSignals({
      point: capital,
      provinceName: name,
      weather: wx.data,
      airQuality: aq.data,
      hotspots,
      warnings,
    });
    return assessRisk(signals, profile);
  }, [capital, wx.isPending, wx.data, aq.data, hotspots, warnings, name, profile]);

  const trend = trends()[stats?.trend ?? 'stable'];
  const regionCtx = useMemo(
    () => ({
      region: {
        name,
        hotspots24h: stats?.last24h ?? 0,
        hotspots7d: stats?.total7d ?? 0,
        trend: stats?.trend ?? 'stable',
        warnings: warnings.length,
      },
    }),
    [name, stats, warnings.length],
  );
  const baseContext = useAiContext(undefined, regionCtx);
  const ai = useAiMutation('region');
  // The explanation renders below the stats; bring it into view once requested.
  const aiRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ai.isPending || ai.data) aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [ai.isPending, ai.data]);

  const explain = () => {
    if (!baseContext || !assessment || !capital) return;
    // Every number must describe the province (its capital), never the user's own
    // location: hazards, hotspots, weather and warnings all come from `assessment`.
    const context = buildAiContext({
      location: {
        id: `province-${code}`,
        name: t(`${capital.name} (ibu kota ${name})`, `${capital.name} (capital of ${name})`),
        region: name,
        provinceCode: code,
        lat: capital.lat,
        lon: capital.lon,
        source: 'preset',
      },
      assessment,
      profile,
      weather: wx.data ?? null,
      dataMode: baseContext.dataMode,
      warningTitles: warnings.map((x) => x.title),
      windows: [],
      hotspotSource: baseContext.hotspots?.source,
      region: regionCtx.region,
    });
    ai.mutate({ context });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
        <div>
          <p className="telemetry !text-brand">{t('Ringkasan regional', 'Regional summary')}</p>
          <h2 className="mt-1 text-[22px] font-bold tracking-[-0.02em]">{name}</h2>
          {capital && (
            <p className="mt-0.5 text-[12.5px] text-muted">
              {t('Ibu kota', 'Capital')} {capital.name}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={t('Tutup ringkasan', 'Close summary')}
        >
          <X />
        </Button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
          <Stat label={t('Titik panas 24 jam', 'Hotspots 24 h')} value={String(stats?.last24h ?? 0)} />
          <Stat label={t('7 hari', '7 days')} value={String(stats?.total7d ?? 0)} />
          <div className="bg-surface p-3">
            <p className="telemetry !text-[10px]">{t('Tren', 'Trend')}</p>
            <p
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold ${trend.cls}`}
            >
              <trend.icon className="size-3.5" /> {trend.label}
            </p>
          </div>
        </div>

        {stats && stats.total7d > 0 ? (
          <div>
            <p className="data-label mb-2 flex items-center gap-1.5">
              <Flame className="size-3.5 text-hz-fire" /> {t('Deteksi per hari', 'Detections per day')}
            </p>
            <DailyCountChart daily={stats.daily} />
            <p className="telemetry mt-1.5 normal-case tracking-normal">
              {t(
                'Deteksi termal satelit VIIRS — bukan konfirmasi kebakaran',
                'VIIRS satellite thermal detections — not confirmed fires',
              )}
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-[var(--risk-safe-soft)] px-3 py-2.5 text-[13px] text-[var(--risk-safe-text)]">
            {t(
              'Tidak ada deteksi titik panas satelit di provinsi ini dalam 7 hari terakhir.',
              'No satellite hotspot detections in this province in the last 7 days.',
            )}
          </p>
        )}

        <div>
          <p className="data-label mb-2">
            {t('Kondisi di', 'Conditions in')} {capital?.name ?? name}
          </p>
          {wx.data ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-raised p-3.5">
              <WeatherIcon code={wx.data.current.weatherCode} className="size-8 text-neutral-600" />
              <div className="flex-1 text-[13px]">
                <p className="font-semibold">
                  {describeWeather(wx.data.current)} · {Math.round(wx.data.current.temperature ?? 0)}°C
                </p>
                <p className="text-muted">
                  RH {Math.round(wx.data.current.humidity ?? 0)}% · {t('angin', 'wind')}{' '}
                  {Math.round(wx.data.current.windSpeed ?? 0)} {t('km/j', 'km/h')} ·{' '}
                  {t('hujan 24j', '24h rain')} {wx.data.next24h.precipitationSum.toFixed(1)} mm
                  {aq.data?.pm25 != null && ` · PM2.5 ${Math.round(aq.data.pm25)}`}
                </p>
              </div>
              <FreshnessBadge provenance={wx.data.provenance} />
            </div>
          ) : wx.isError ? (
            <p className="text-[13px] text-muted">
              {t('Cuaca sementara tidak tersedia.', 'Weather is temporarily unavailable.')}
            </p>
          ) : (
            <Skeleton className="h-16" />
          )}
        </div>

        {assessment && (
          <div>
            <p className="data-label mb-2">{t('Risiko indikatif · ibu kota', 'Indicative risk · capital')}</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {HAZARD_ORDER.map((k) => (
                <li key={k} className="flex items-center justify-between gap-2 px-3 py-2.5 text-[13px]">
                  <span className="flex items-center gap-2 font-medium">
                    {(() => {
                      const I = HAZARD_ICONS[k];
                      return <I className="size-4 text-muted" aria-hidden />;
                    })()}
                    {HAZARDS[k].label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-muted">
                      {assessment.hazards[k].available ? assessment.hazards[k].score : '–'}
                    </span>
                    {assessment.hazards[k].available && <RiskBadge level={assessment.hazards[k].level} />}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="data-label mb-2">{t('Peringatan dini BMKG', 'BMKG early warnings')}</p>
          {warnings.length ? (
            <ul className="space-y-2">
              {warnings.slice(0, 3).map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl border border-risk-moderate/30 bg-[var(--risk-moderate-soft)]/70 p-3 text-[12.5px]"
                >
                  <p className="font-semibold text-[var(--risk-moderate-text)]">{w.title}</p>
                  <p className="mt-1 line-clamp-3 text-[var(--risk-moderate-text)]/80">{w.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">
              {t('Tidak ada peringatan dini cuaca aktif.', 'No active weather early warnings.')}
            </p>
          )}
        </div>

        <div ref={aiRef} className="scroll-mb-4 empty:hidden">
          {ai.data ? (
            <AiPanel
              title={t('Penjelasan regional', 'Regional explanation')}
              provider={ai.data.provider}
              fallbackReason={ai.data.fallback ? ai.data.fallbackReason : undefined}
              compact
            >
              <p className="font-semibold text-ink">{ai.data.output.headline}</p>
              <RichText text={ai.data.output.summary} className="mt-1 text-[13px]" />
              <p className="mt-2 text-[13px] text-neutral-700">
                <b>{t('Pantau:', 'Watch:')}</b> {ai.data.output.outlook}
              </p>
            </AiPanel>
          ) : ai.isPending ? (
            <AiPanel title={t('Penjelasan regional', 'Regional explanation')} compact>
              <AiThinking />
            </AiPanel>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 border-t border-line bg-raised px-6 pt-4 pb-[calc(1rem+var(--safe-bottom))] sm:grid-cols-2">
        <Button variant="ai" onClick={explain} disabled={!assessment || ai.isPending}>
          <Sparkles /> {t('Jelaskan dengan AI', 'Explain with AI')}
        </Button>
        {capital && (
          <Button
            onClick={() => {
              setScenario(null);
              setCurrent({
                id: `preset-${capital.slug}`,
                name: capital.name,
                region: capital.province,
                provinceCode: capital.provinceCode,
                lat: capital.lat,
                lon: capital.lon,
                source: 'preset',
              });
              navigate('/app');
            }}
          >
            {t('Analisis', 'Analyse')} {capital.name} <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3">
      <p className="telemetry !text-[10px]">{label}</p>
      <p className="display-metric mt-1.5 text-[24px]">{value}</p>
    </div>
  );
}
