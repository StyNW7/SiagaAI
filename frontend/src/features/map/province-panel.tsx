import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Flame, Minus, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { FreshnessBadge } from '@/components/common/data-state';
import { AiPanel, AiThinking, RichText, WeatherIcon } from '@/components/common/layout-bits';
import { RiskBadge } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { PROVINCE_CAPITAL } from '@/data/cities';
import { DailyCountChart } from '@/features/charts/charts';
import { assessRisk, buildSignals } from '@/features/risk/engine';
import { useAiContext, useAiMutation } from '@/hooks/use-ai';
import { compass } from '@/lib/format';
import { HAZARD_ORDER, HAZARDS } from '@/lib/risk-levels';
import type { ProvinceHotspotStats } from '@/services/hazards/hotspots';
import { getAirQuality, getWeatherBundle } from '@/services/weather';
import { useLocationStore, useProfileStore, useSettings } from '@/stores';
import type { Hotspot, OfficialWarning } from '@/types/domain';

const TREND = {
  increasing: { label: 'Meningkat', icon: TrendingUp, cls: 'text-red-700 bg-red-50' },
  stable: { label: 'Stabil', icon: Minus, cls: 'text-neutral-700 bg-neutral-100' },
  decreasing: { label: 'Menurun', icon: TrendingDown, cls: 'text-green-700 bg-green-50' },
};

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

  const trend = TREND[stats?.trend ?? 'stable'];
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

  const explain = () => {
    if (!baseContext || !assessment) return;
    const w = wx.data?.current;
    ai.mutate({
      context: {
        ...baseContext,
        location: {
          name: `${capital?.name ?? name} (ibu kota ${name})`,
          region: name,
          lat: capital?.lat ?? 0,
          lon: capital?.lon ?? 0,
        },
        weather: w
          ? {
              description: w.description,
              temperature: w.temperature,
              humidity: w.humidity,
              windSpeed: w.windSpeed,
              windFrom: w.windDirection != null ? compass(w.windDirection) : null,
              rain24hMm: wx.data!.next24h.precipitationSum,
              rainPeakMmPerHour: wx.data!.next24h.precipitationMaxHourly,
              rainProbabilityMax: wx.data!.next24h.precipitationProbabilityMax,
              thunderstormHours: wx.data!.next24h.thunderstormHours,
              source: wx.data!.provenance.source,
            }
          : null,
        airQuality: aq.data ? { pm25: aq.data.pm25, usAqi: aq.data.usAqi } : null,
        officialWarnings: warnings.map((x) => x.title),
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Ringkasan regional</p>
          <h2 className="mt-0.5 text-xl font-bold">{name}</h2>
          {capital && <p className="text-[12.5px] text-muted">Ibu kota: {capital.name}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup ringkasan">
          <X />
        </Button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Titik panas 24 jam" value={String(stats?.last24h ?? 0)} />
          <Stat label="7 hari" value={String(stats?.total7d ?? 0)} />
          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-[11px] font-medium text-muted">Tren</p>
            <p
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold ${trend.cls}`}
            >
              <trend.icon className="size-3.5" /> {trend.label}
            </p>
          </div>
        </div>

        {stats && stats.total7d > 0 ? (
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-muted">
              <Flame className="size-3.5 text-orange-500" /> Deteksi titik panas per hari
            </p>
            <DailyCountChart daily={stats.daily} />
            <p className="mt-1 text-[11px] text-muted">
              Titik panas = deteksi termal satelit VIIRS, bukan konfirmasi kebakaran.
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-green-50 px-3 py-2.5 text-[13px] text-green-800">
            Tidak ada deteksi titik panas satelit di provinsi ini dalam 7 hari terakhir.
          </p>
        )}

        <div>
          <p className="mb-2 text-[12px] font-semibold text-muted">Kondisi di {capital?.name ?? name}</p>
          {wx.data ? (
            <div className="flex items-center gap-3 rounded-xl border border-line p-3">
              <WeatherIcon code={wx.data.current.weatherCode} className="size-8 text-neutral-600" />
              <div className="flex-1 text-[13px]">
                <p className="font-semibold">
                  {wx.data.current.description} · {Math.round(wx.data.current.temperature ?? 0)}°C
                </p>
                <p className="text-muted">
                  RH {Math.round(wx.data.current.humidity ?? 0)}% · angin{' '}
                  {Math.round(wx.data.current.windSpeed ?? 0)} km/j · hujan 24j{' '}
                  {wx.data.next24h.precipitationSum.toFixed(1)} mm
                  {aq.data?.pm25 != null && ` · PM2.5 ${Math.round(aq.data.pm25)}`}
                </p>
              </div>
              <FreshnessBadge provenance={wx.data.provenance} />
            </div>
          ) : wx.isError ? (
            <p className="text-[13px] text-muted">Cuaca sementara tidak tersedia.</p>
          ) : (
            <Skeleton className="h-16" />
          )}
        </div>

        {assessment && (
          <div>
            <p className="mb-2 text-[12px] font-semibold text-muted">
              Ringkasan risiko (indikatif, di ibu kota)
            </p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {HAZARD_ORDER.map((k) => (
                <li key={k} className="flex items-center justify-between gap-2 px-3 py-2.5 text-[13px]">
                  <span className="font-medium">
                    {HAZARDS[k].emoji} {HAZARDS[k].label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-muted">
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
          <p className="mb-2 text-[12px] font-semibold text-muted">Peringatan dini BMKG</p>
          {warnings.length ? (
            <ul className="space-y-2">
              {warnings.slice(0, 3).map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[12.5px]"
                >
                  <p className="font-semibold text-amber-900">{w.title}</p>
                  <p className="mt-1 line-clamp-3 text-amber-900/80">{w.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Tidak ada peringatan dini cuaca aktif.</p>
          )}
        </div>

        {ai.data ? (
          <AiPanel
            title="Penjelasan regional"
            provider={ai.data.provider}
            fallbackReason={ai.data.fallback ? ai.data.fallbackReason : undefined}
            compact
          >
            <p className="font-semibold text-ink">{ai.data.output.headline}</p>
            <RichText text={ai.data.output.summary} className="mt-1 text-[13px]" />
            <p className="mt-2 text-[13px] text-neutral-700">
              <b>Pantau:</b> {ai.data.output.outlook}
            </p>
          </AiPanel>
        ) : ai.isPending ? (
          <AiPanel title="Penjelasan regional" compact>
            <AiThinking />
          </AiPanel>
        ) : null}
      </div>
      <div className="safe-bottom grid gap-2 border-t border-line p-4 sm:grid-cols-2">
        <Button variant="ai" onClick={explain} disabled={!assessment || ai.isPending}>
          <Sparkles /> Jelaskan dengan AI
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
            Analisis {capital.name} <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="tabular mt-0.5 text-[22px] font-bold leading-none">{value}</p>
    </div>
  );
}
