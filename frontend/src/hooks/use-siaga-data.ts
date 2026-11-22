import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DEFAULT_CITY } from '@/data/cities';
import { buildScenario, SCENARIOS, type ScenarioId } from '@/data/scenarios';
import {
  assessRisk,
  buildSignals,
  findOutdoorWindows,
  hourlyOutdoorIndex,
  summarizeHotspots,
  warningsForProvince,
} from '@/features/risk/engine';
import { getEarthquakes, getOfficialWarnings } from '@/services/hazards/bmkg-alerts';
import { getHotspots } from '@/services/hazards/hotspots';
import { getAirQuality, getRiverDischarge, getWeatherBundle } from '@/services/weather';
import { useLocationStore, useProfileStore, useSettings } from '@/stores';
import type { DataMode, OfficialWarning, Provenance, UserLocation } from '@/types/domain';
import { getLang, t } from '@/lib/i18n';

const MIN = 60_000;

export const DEFAULT_LOCATION: UserLocation = {
  id: 'default',
  name: DEFAULT_CITY.name,
  region: DEFAULT_CITY.province,
  provinceCode: DEFAULT_CITY.provinceCode,
  lat: DEFAULT_CITY.lat,
  lon: DEFAULT_CITY.lon,
  source: 'default',
};

export function useActiveLocation(): UserLocation {
  const scenario = useSettings((s) => s.scenario);
  const current = useLocationStore((s) => s.current);
  if (scenario) return SCENARIOS[scenario].location;
  return current ?? DEFAULT_LOCATION;
}

type ScenarioBundle = ReturnType<typeof buildScenario> & {
  warningsResponse: { warnings: OfficialWarning[]; provenance: Provenance };
};
const scenarioCache = new Map<string, ScenarioBundle>();

/** Scenario data is memoised per 10-minute bucket so object identity stays stable across renders. */
function scenarioData(id: ScenarioId): ScenarioBundle {
  const bucket = `${id}:${getLang()}:${Math.floor(Date.now() / (10 * MIN))}`;
  if (!scenarioCache.has(bucket)) {
    scenarioCache.clear();
    const data = buildScenario(id);
    scenarioCache.set(bucket, {
      ...data,
      warningsResponse: {
        warnings: data.warnings,
        provenance: {
          source: t('SIMULASI — Peringatan', 'SIMULATION — Warnings'),
          fetchedAt: new Date().toISOString(),
          mode: 'scenario',
        },
      },
    });
  }
  return scenarioCache.get(bucket)!;
}

const key = (l: UserLocation) => [Math.round(l.lat * 100) / 100, Math.round(l.lon * 100) / 100];

export function useHotspotsQuery(enabled = true) {
  return useQuery({
    queryKey: ['hotspots'],
    queryFn: ({ signal }) => getHotspots(signal),
    staleTime: 30 * MIN,
    refetchInterval: 30 * MIN,
    enabled,
  });
}
export function useWarningsQuery(enabled = true) {
  return useQuery({
    queryKey: ['warnings'],
    queryFn: ({ signal }) => getOfficialWarnings(signal),
    staleTime: 10 * MIN,
    refetchInterval: 15 * MIN,
    retry: 1,
    enabled,
  });
}
export function useEarthquakesQuery() {
  return useQuery({
    queryKey: ['earthquakes'],
    queryFn: ({ signal }) => getEarthquakes(signal),
    staleTime: 10 * MIN,
    refetchInterval: 15 * MIN,
  });
}

export type SourceState = 'loading' | 'success' | 'error';

function stateOf(q: UseQueryResult<unknown>, scenario: boolean): SourceState {
  if (scenario) return 'success';
  if (q.isPending) return 'loading';
  if (q.isError && !q.data) return 'error';
  return 'success';
}

/** All environmental inputs for the active location, from live APIs or the active scenario. */
export function useSiagaData() {
  const scenario = useSettings((s) => s.scenario);
  const location = useActiveLocation();
  const live = !scenario;
  const k = key(location);

  const weatherQ = useQuery({
    queryKey: ['weather', ...k],
    queryFn: ({ signal }) => getWeatherBundle(location, signal),
    staleTime: 15 * MIN,
    refetchInterval: 30 * MIN,
    enabled: live,
  });
  const airQ = useQuery({
    queryKey: ['air', ...k],
    queryFn: ({ signal }) => getAirQuality(location, signal),
    staleTime: 30 * MIN,
    enabled: live,
    retry: 1,
  });
  const riverQ = useQuery({
    queryKey: ['river', ...k],
    queryFn: ({ signal }) => getRiverDischarge(location, signal),
    staleTime: 3 * 60 * MIN,
    enabled: live,
    retry: 1,
  });
  const hotspotsQ = useHotspotsQuery(live);
  const warningsQ = useWarningsQuery(live);
  const quakesQ = useEarthquakesQuery();

  const sim = scenario ? scenarioData(scenario) : null;

  return {
    location,
    scenario,
    weather: {
      data: sim?.weather ?? weatherQ.data ?? null,
      state: stateOf(weatherQ, !!sim),
      refetch: weatherQ.refetch,
    },
    airQuality: { data: sim?.airQuality ?? airQ.data ?? null, state: stateOf(airQ, !!sim) },
    river: { data: sim?.river ?? riverQ.data ?? null, state: stateOf(riverQ, !!sim) },
    hotspots: { data: sim?.hotspots ?? hotspotsQ.data ?? null, state: stateOf(hotspotsQ, !!sim) },
    warnings: {
      data: sim ? sim.warningsResponse : (warningsQ.data ?? null),
      state: stateOf(warningsQ, !!sim),
    },
    earthquakes: { data: quakesQ.data ?? null, state: stateOf(quakesQ, false) },
    isFetching: weatherQ.isFetching || hotspotsQ.isFetching || airQ.isFetching,
  };
}

export type SiagaData = ReturnType<typeof useSiagaData>;

/** Deterministic assessment for the active location + profile. */
export function useRiskAssessment() {
  const data = useSiagaData();
  const profile = useProfileStore((s) => s.profile);
  const { location, weather, airQuality, river, hotspots, warnings } = data;

  const ready = weather.state !== 'loading' && hotspots.state !== 'loading';

  const result = useMemo(() => {
    if (!ready) return null;
    const signals = buildSignals({
      point: location,
      provinceName: location.region,
      weather: weather.data,
      airQuality: airQuality.data,
      hotspots: hotspots.data?.hotspots ?? null,
      river: river.data,
      warnings:
        warnings.state === 'error'
          ? null
          : (warnings.data?.warnings ?? (warnings.state === 'loading' ? null : [])),
    });
    const assessment = assessRisk(signals, profile);
    const nearby = hotspots.data
      ? summarizeHotspots(location, hotspots.data.hotspots, weather.data?.current.windDirection ?? null)
          .nearby
      : [];
    const hourly = weather.data ? hourlyOutdoorIndex(weather.data.hourly, airQuality.data) : [];
    const windows = findOutdoorWindows(hourly);
    const localWarnings = warnings.data ? warningsForProvince(warnings.data.warnings, location.region) : [];
    return { assessment, nearby, hourly, windows, localWarnings };
  }, [
    ready,
    location,
    weather.data,
    airQuality.data,
    hotspots.data,
    river.data,
    warnings.data,
    warnings.state,
    profile,
  ]);

  const dataMode: DataMode = data.scenario
    ? 'scenario'
    : hotspots.data?.provenance.mode === 'snapshot'
      ? 'snapshot'
      : !navigator.onLine
        ? 'cached'
        : 'live';

  const sources: { key: string; label: string; state: SourceState; provenance?: Provenance }[] = [
    { key: 'weather', label: t('Cuaca', 'Weather'), state: weather.state, provenance: weather.data?.provenance },
    { key: 'hotspots', label: t('Titik panas', 'Hotspots'), state: hotspots.state, provenance: hotspots.data?.provenance },
    { key: 'air', label: t('Kualitas udara', 'Air quality'), state: airQuality.state, provenance: airQuality.data?.provenance },
    { key: 'river', label: t('Debit sungai', 'River discharge'), state: river.state, provenance: river.data?.provenance },
    {
      key: 'warnings',
      label: t('Peringatan BMKG', 'BMKG warnings'),
      state: warnings.state,
      provenance: warnings.data?.provenance,
    },
  ];

  return { ...data, ...(result ?? {}), assessment: result?.assessment ?? null, ready, dataMode, sources };
}

export type RiskView = ReturnType<typeof useRiskAssessment>;
