import { haversineKm, isUpwind } from '@/lib/geo';
import { hoursSince } from '@/lib/format';
import type {
  AirQuality,
  GeoPoint,
  Hotspot,
  OfficialWarning,
  RiverDischarge,
  WeatherBundle,
} from '@/types/domain';
import type { HazardSignals } from './types';

export interface SignalInputs {
  point: GeoPoint;
  provinceName?: string | null;
  weather?: WeatherBundle | null;
  airQuality?: AirQuality | null;
  hotspots?: Hotspot[] | null;
  river?: RiverDischarge | null;
  /** `null` = feed unavailable; `[]` = feed OK, no warnings. */
  warnings?: OfficialWarning[] | null;
  now?: number;
}

export interface HotspotProximity {
  nearestKm: number | null;
  count25: number;
  count50: number;
  count100: number;
  upwindCount150: number;
  latestHoursAgo: number | null;
  frpSum50: number;
  nearby: (Hotspot & { distanceKm: number })[];
}

/** Hotspots in the last 72 h are considered for proximity (older detections are history). */
export const HOTSPOT_WINDOW_HOURS = 72;

export function summarizeHotspots(
  point: GeoPoint,
  hotspots: Hotspot[],
  windFromDeg: number | null,
  now = Date.now(),
): HotspotProximity {
  let nearestKm: number | null = null;
  let count25 = 0;
  let count50 = 0;
  let count100 = 0;
  let upwindCount150 = 0;
  let latest: number | null = null;
  let frpSum50 = 0;
  const nearby: (Hotspot & { distanceKm: number })[] = [];

  for (const h of hotspots) {
    if (Math.abs(h.lat - point.lat) > 1.5 || Math.abs(h.lon - point.lon) > 1.5) continue;
    const age = hoursSince(h.time, now);
    if (age > HOTSPOT_WINDOW_HOURS) continue;
    const d = haversineKm(point, h);
    if (d > 150) continue;
    nearby.push({ ...h, distanceKm: d });
    if (nearestKm == null || d < nearestKm) nearestKm = d;
    if (d <= 25) count25++;
    if (d <= 50) {
      count50++;
      frpSum50 += h.frp;
    }
    if (d <= 100) {
      count100++;
      if (latest == null || age < latest) latest = age;
    }
    if (windFromDeg != null && isUpwind(point, h, windFromDeg)) upwindCount150++;
  }

  nearby.sort((a, b) => a.distanceKm - b.distanceKm);
  return { nearestKm, count25, count50, count100, upwindCount150, latestHoursAgo: latest, frpSum50, nearby };
}

/**
 * Province names differ across sources (BMKG, OSM, our 34-province boundaries).
 * Post-2022 Papua provinces map onto their pre-split parent boundary.
 */
const PROVINCE_ALIASES: Record<string, string> = {
  bangkabelitung: 'kepulauanbangkabelitung',
  nad: 'aceh',
  nanggroeacehdarussalam: 'aceh',
  papuatengah: 'papua',
  papuapegunungan: 'papua',
  papuaselatan: 'papua',
  papuabaratdaya: 'papuabarat',
  ntb: 'nusatenggarabarat',
  ntt: 'nusatenggaratimur',
  jakarta: 'dkijakarta',
};

export const normalizeProvince = (s: string) => {
  const n = s
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/^(provinsi|prov)/, '')
    .replace(/^(daerahistimewa|di)(?=yogyakarta)/, '')
    .replace(/^daerahkhususibukota/, 'dki');
  return PROVINCE_ALIASES[n] ?? n;
};

export function warningsForProvince(warnings: OfficialWarning[], provinceName?: string | null) {
  if (!provinceName) return [];
  const target = normalizeProvince(provinceName);
  return warnings.filter((w) => w.province && normalizeProvince(w.province) === target);
}

export function buildSignals(input: SignalInputs): HazardSignals {
  const now = input.now ?? Date.now();
  const w = input.weather;

  const weather: HazardSignals['weather'] = w
    ? {
        temperature: w.current.temperature,
        humidity: w.current.humidity,
        windSpeed: w.current.windSpeed,
        windDirection: w.current.windDirection,
        visibility: w.current.visibility,
        weatherCode: w.current.weatherCode,
        precip24h: w.next24h.precipitationSum,
        precipMaxHourly: w.next24h.precipitationMaxHourly,
        precipProbMax: w.next24h.precipitationProbabilityMax,
        thunderstormHours: w.next24h.thunderstormHours,
        gustMax: w.next24h.gustMax,
        tempMax: w.next24h.temperatureMax,
      }
    : null;

  const hotspots = input.hotspots
    ? (() => {
        const { nearby: _nearby, ...summary } = summarizeHotspots(
          input.point,
          input.hotspots,
          weather?.windDirection ?? null,
          now,
        );
        return summary;
      })()
    : null;

  const warnings = input.warnings == null ? null : warningsForProvince(input.warnings, input.provinceName);

  return {
    weather,
    airQuality: input.airQuality ? { pm25: input.airQuality.pm25, usAqi: input.airQuality.usAqi } : null,
    hotspots,
    river: input.river ? { ratio: input.river.ratio, forecastMax: input.river.forecastMax } : null,
    officialWarning: warnings
      ? { active: warnings.length > 0, count: warnings.length, titles: warnings.map((x) => x.title) }
      : null,
  };
}
