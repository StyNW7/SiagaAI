/**
 * Open-Meteo (open-meteo.com) — free, keyless, CORS-enabled.
 * Used for hourly forecast detail, CAMS air-quality model and GloFAS river discharge.
 * Licence: CC BY 4.0 — attribution shown in the UI.
 */
import { describeWmo, isHeavyRain, isThunderstorm } from '@/lib/weather-codes';
import type {
  AirQuality,
  DailyWeather,
  GeoPoint,
  HourlyWeather,
  RiverDischarge,
  WeatherNow,
  WeatherSummary24h,
} from '@/types/domain';
import { fetchJson, nowIso } from '../http';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FLOOD = 'https://flood-api.open-meteo.com/v1/flood';

/** Open-Meteo local times (timezone=Asia/Jakarta) → absolute ISO. */
const wib = (t: string) => new Date(`${t.length === 16 ? `${t}:00` : t}+07:00`).toISOString();
const coords = (p: GeoPoint) => `latitude=${p.lat.toFixed(4)}&longitude=${p.lon.toFixed(4)}`;

interface OmForecast {
  current: Record<string, number | string>;
  hourly: Record<string, (number | null)[]> & { time: string[] };
  daily: Record<string, (number | null)[]> & { time: string[] };
}

const HOURLY_VARS =
  'temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m';
const CURRENT_VARS =
  'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility';

export interface OpenMeteoForecast {
  current: WeatherNow;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function getOpenMeteoForecast(
  point: GeoPoint,
  signal?: AbortSignal,
): Promise<OpenMeteoForecast> {
  const url = `${FORECAST}?${coords(point)}&current=${CURRENT_VARS}&hourly=${HOURLY_VARS}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FJakarta&forecast_days=4&past_hours=2`;
  const d = await fetchJson<OmForecast>(url, { service: 'Open-Meteo', signal });
  const c = d.current;
  const code = num(c.weather_code);
  const current: WeatherNow = {
    time: wib(String(c.time)),
    temperature: num(c.temperature_2m),
    humidity: num(c.relative_humidity_2m),
    windSpeed: num(c.wind_speed_10m),
    windDirection: num(c.wind_direction_10m),
    windGust: num(c.wind_gusts_10m),
    weatherCode: code,
    description: describeWmo(code),
    visibility: num(c.visibility),
    cloudCover: num(c.cloud_cover),
    apparentTemperature: num(c.apparent_temperature),
  };
  const h = d.hourly;
  const hourly: HourlyWeather[] = h.time.map((t, i) => ({
    time: wib(t),
    temperature: h.temperature_2m[i],
    humidity: h.relative_humidity_2m[i],
    precipitation: h.precipitation[i],
    precipitationProbability: h.precipitation_probability[i],
    weatherCode: h.weather_code[i],
    windSpeed: h.wind_speed_10m[i],
    windGust: h.wind_gusts_10m[i],
    windDirection: h.wind_direction_10m[i],
  }));
  const dl = d.daily;
  const daily: DailyWeather[] = dl.time.map((t, i) => ({
    date: t,
    tempMax: dl.temperature_2m_max[i],
    tempMin: dl.temperature_2m_min[i],
    precipitationSum: dl.precipitation_sum[i],
    precipitationProbabilityMax: dl.precipitation_probability_max[i],
    weatherCode: dl.weather_code[i],
  }));
  return { current, hourly, daily };
}

export function summarizeNext24h(hourly: HourlyWeather[], now = Date.now()): WeatherSummary24h {
  const window = hourly.filter((h) => {
    const t = new Date(h.time).getTime();
    return t >= now - 3_600_000 && t < now + 24 * 3_600_000;
  });
  const max = (sel: (h: HourlyWeather) => number | null) =>
    window.reduce((m, h) => Math.max(m, sel(h) ?? 0), 0);
  return {
    precipitationSum: Math.round(window.reduce((s, h) => s + (h.precipitation ?? 0), 0) * 10) / 10,
    precipitationMaxHourly: max((h) => h.precipitation),
    precipitationProbabilityMax: max((h) => h.precipitationProbability),
    gustMax: max((h) => h.windGust),
    temperatureMax: max((h) => h.temperature),
    thunderstormHours: window.filter((h) => isThunderstorm(h.weatherCode)).length,
    heavyRainHours: window.filter((h) => isHeavyRain(h.weatherCode) || (h.precipitation ?? 0) >= 10).length,
  };
}

interface OmAir {
  current: { time: string; pm2_5: number | null; pm10: number | null; us_aqi: number | null };
  hourly: { time: string[]; pm2_5: (number | null)[] };
}

export async function getAirQuality(point: GeoPoint, signal?: AbortSignal): Promise<AirQuality> {
  const url = `${AIR}?${coords(point)}&current=pm2_5,pm10,us_aqi&hourly=pm2_5&forecast_days=2&timezone=Asia%2FJakarta`;
  const d = await fetchJson<OmAir>(url, { service: 'Open-Meteo Air Quality', signal });
  return {
    pm25: num(d.current.pm2_5),
    pm10: num(d.current.pm10),
    usAqi: num(d.current.us_aqi),
    hourly: d.hourly.time.map((t, i) => ({ time: wib(t), pm25: d.hourly.pm2_5[i] })),
    provenance: {
      source: 'CAMS (Copernicus) via Open-Meteo — model, bukan sensor',
      issuedAt: wib(d.current.time),
      fetchedAt: nowIso(),
      mode: 'live',
      url: 'https://open-meteo.com/en/docs/air-quality-api',
    },
  };
}

interface OmFlood {
  daily: { time: string[]; river_discharge: (number | null)[] };
}

/** Rivers with a 30-day mean below this (m³/s) are too small for GloFAS' 5 km grid to be meaningful. */
const MIN_BASELINE = 5;

export async function getRiverDischarge(point: GeoPoint, signal?: AbortSignal): Promise<RiverDischarge> {
  const url = `${FLOOD}?${coords(point)}&daily=river_discharge&past_days=30&forecast_days=7`;
  const d = await fetchJson<OmFlood>(url, { service: 'GloFAS', signal });
  const today = new Date().toISOString().slice(0, 10);
  const series = d.daily.time.map((date, i) => ({
    date,
    discharge: d.daily.river_discharge[i],
    forecast: date >= today,
  }));
  const past = series.filter((s) => !s.forecast && s.discharge != null).map((s) => s.discharge as number);
  const future = series.filter((s) => s.forecast && s.discharge != null).map((s) => s.discharge as number);
  const baseline = past.length ? past.reduce((a, b) => a + b, 0) / past.length : null;
  const forecastMax = future.length ? Math.max(...future) : null;
  const ratio =
    baseline != null && forecastMax != null && baseline >= MIN_BASELINE ? forecastMax / baseline : null;
  return {
    forecastMax,
    baseline,
    ratio,
    series,
    provenance: {
      source: 'GloFAS v4 via Open-Meteo Flood API',
      fetchedAt: nowIso(),
      mode: 'live',
      url: 'https://open-meteo.com/en/docs/flood-api',
    },
  };
}

export interface PointSnapshot {
  temperature: number | null;
  humidity: number | null;
  weatherCode: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pm25: number | null;
  usAqi: number | null;
}

/** Batched current conditions for many points (national map layer) — 2 requests total. */
export async function getMultiPointSnapshot(
  points: GeoPoint[],
  signal?: AbortSignal,
): Promise<PointSnapshot[]> {
  const lat = points.map((p) => p.lat.toFixed(3)).join(',');
  const lon = points.map((p) => p.lon.toFixed(3)).join(',');
  const [wx, aq] = await Promise.allSettled([
    fetchJson<{ current: Record<string, number> }[]>(
      `${FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation,wind_speed_10m,wind_direction_10m&timezone=Asia%2FJakarta`,
      { service: 'Open-Meteo', signal, timeoutMs: 15_000 },
    ),
    fetchJson<{ current: Record<string, number> }[]>(
      `${AIR}?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi&timezone=Asia%2FJakarta`,
      { service: 'Open-Meteo Air Quality', signal, timeoutMs: 15_000 },
    ),
  ]);
  if (wx.status === 'rejected' && aq.status === 'rejected') throw wx.reason;
  const w = wx.status === 'fulfilled' ? (Array.isArray(wx.value) ? wx.value : [wx.value]) : [];
  const a = aq.status === 'fulfilled' ? (Array.isArray(aq.value) ? aq.value : [aq.value]) : [];
  return points.map((_, i) => ({
    temperature: num(w[i]?.current.temperature_2m),
    humidity: num(w[i]?.current.relative_humidity_2m),
    weatherCode: num(w[i]?.current.weather_code),
    precipitation: num(w[i]?.current.precipitation),
    windSpeed: num(w[i]?.current.wind_speed_10m),
    windDirection: num(w[i]?.current.wind_direction_10m),
    pm25: num(a[i]?.current.pm2_5),
    usAqi: num(a[i]?.current.us_aqi),
  }));
}
