import { CITIES, type City } from '@/data/cities';
import { haversineKm } from '@/lib/geo';
import type { GeoPoint, WeatherBundle } from '@/types/domain';
import { nowIso } from '../http';
import { currentBmkgEntry, getBmkgForecast } from './bmkg';
import { getOpenMeteoForecast, summarizeNext24h } from './open-meteo';

export * from './open-meteo';
export * from './bmkg';

/** BMKG forecasts are kelurahan-level; we use one when a verified adm4 point lies within this radius. */
export const BMKG_MAX_DISTANCE_KM = 30;

export function nearestBmkgCity(point: GeoPoint): (City & { distanceKm: number }) | null {
  let best: (City & { distanceKm: number }) | null = null;
  for (const c of CITIES) {
    if (!c.adm4) continue;
    const d = haversineKm(point, c);
    if (d <= BMKG_MAX_DISTANCE_KM && (!best || d < best.distanceKm)) best = { ...c, distanceKm: d };
  }
  return best;
}

/**
 * Weather bundle: Open-Meteo provides the full hourly series everywhere; when an
 * official BMKG kelurahan forecast is available nearby, its current values
 * (temperature, humidity, wind, condition) take precedence and are attributed.
 */
export async function getWeatherBundle(point: GeoPoint, signal?: AbortSignal): Promise<WeatherBundle> {
  const bmkgCity = nearestBmkgCity(point);
  const [om, bmkg] = await Promise.allSettled([
    getOpenMeteoForecast(point, signal),
    bmkgCity?.adm4 ? getBmkgForecast(bmkgCity.adm4, signal) : Promise.reject(new Error('no-bmkg')),
  ]);

  if (om.status === 'rejected' && bmkg.status === 'rejected') throw om.reason;

  const bmkgData = bmkg.status === 'fulfilled' ? bmkg.value : undefined;
  const now = bmkgData ? currentBmkgEntry(bmkgData) : null;

  if (om.status === 'fulfilled') {
    const base = om.value;
    const current = now
      ? {
          ...base.current,
          temperature: now.temperature,
          humidity: now.humidity,
          windSpeed: now.windSpeed,
          windDirection: now.windDirection,
          weatherCode: now.weatherCode,
          description: now.description,
        }
      : base.current;
    return {
      current,
      hourly: base.hourly,
      daily: base.daily,
      next24h: summarizeNext24h(base.hourly),
      bmkg: bmkgData,
      provenance: {
        source: bmkgData ? 'BMKG (resmi) + Open-Meteo (detail per jam)' : 'Open-Meteo (model ECMWF/GFS)',
        issuedAt: bmkgData?.provenance.issuedAt ?? base.current.time,
        fetchedAt: nowIso(),
        mode: 'live',
        url: bmkgData ? 'https://data.bmkg.go.id/prakiraan-cuaca/' : 'https://open-meteo.com',
      },
    };
  }

  // Open-Meteo failed but BMKG succeeded → derive hourly series from BMKG 3-hour slots.
  const b = bmkgData!;
  const hourly = b.entries.map((e) => ({
    time: e.utcTime,
    temperature: e.temperature,
    humidity: e.humidity,
    precipitation: e.precipitation / 3,
    precipitationProbability: null,
    weatherCode: e.weatherCode,
    windSpeed: e.windSpeed,
    windGust: null,
    windDirection: e.windDirection,
  }));
  const cur = now ?? b.entries[0];
  return {
    current: {
      time: cur.utcTime,
      temperature: cur.temperature,
      humidity: cur.humidity,
      windSpeed: cur.windSpeed,
      windDirection: cur.windDirection,
      windGust: null,
      weatherCode: cur.weatherCode,
      description: cur.description,
      visibility: null,
      cloudCover: cur.cloudCover,
      apparentTemperature: null,
    },
    hourly,
    daily: [],
    next24h: summarizeNext24h(hourly),
    bmkg: b,
    provenance: { ...b.provenance, source: 'BMKG — Prakiraan Cuaca Open Data' },
  };
}
