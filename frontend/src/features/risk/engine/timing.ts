/**
 * Outdoor activity timing — finds the lower-risk windows in the next 24 h by
 * scoring every forecast hour on rain, thunderstorm, heat and PM2.5.
 * Deterministic; the AI only phrases the result.
 */
import { formatHour } from '@/lib/format';
import { piecewise } from '@/lib/utils';
import type { AirQuality, HourlyWeather } from '@/types/domain';
import type { HourlyOutdoorPoint, OutdoorWindow } from './types';

const jakartaHour = (iso: string) =>
  Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(
      new Date(iso),
    ),
  );

export function hourlyOutdoorIndex(
  hourly: HourlyWeather[],
  air?: AirQuality | null,
  now = Date.now(),
): HourlyOutdoorPoint[] {
  const pmByHour = new Map((air?.hourly ?? []).map((p) => [p.time.slice(0, 13), p.pm25]));
  return hourly
    .filter((h) => new Date(h.time).getTime() >= now - 3_600_000)
    .slice(0, 24)
    .map((h) => {
      const rain = Math.max(
        piecewise(h.precipitation ?? 0, [
          [0, 0],
          [0.5, 15],
          [2, 40],
          [5, 70],
          [10, 95],
          [20, 100],
        ]),
        piecewise(h.precipitationProbability ?? 0, [
          [0, 0],
          [50, 15],
          [80, 45],
          [100, 60],
        ]),
      );
      const storm = h.weatherCode != null && h.weatherCode >= 95 ? 100 : 0;
      const heat = piecewise(h.temperature ?? 28, [
        [30, 0],
        [32, 25],
        [34, 55],
        [36, 85],
        [38, 100],
      ]);
      const pm = pmByHour.get(new Date(h.time).toISOString().slice(0, 13));
      const airScore =
        pm == null
          ? 0
          : piecewise(pm, [
              [0, 0],
              [15, 5],
              [35, 35],
              [55, 60],
              [150, 95],
              [250, 100],
            ]);
      return {
        time: h.time,
        rain: Math.round(rain),
        storm,
        heat: Math.round(heat),
        air: Math.round(airScore),
        index: Math.round(Math.max(rain, storm, heat, airScore)),
      };
    });
}

/** Best consecutive windows (≥2 h) during waking hours 05:00–21:00 WIB, lowest mean index first. */
export function findOutdoorWindows(points: HourlyOutdoorPoint[], maxWindows = 2): OutdoorWindow[] {
  const awake = points.filter((p) => {
    const h = jakartaHour(p.time);
    return h >= 5 && h <= 21;
  });
  const candidates: OutdoorWindow[] = [];
  for (let i = 0; i + 1 < awake.length; i++) {
    const slice = awake.slice(i, i + 3);
    if (slice.length < 2) continue;
    const contiguous = slice.every(
      (p, j) => j === 0 || new Date(p.time).getTime() - new Date(slice[j - 1].time).getTime() <= 3_600_000,
    );
    if (!contiguous) continue;
    const mean = slice.reduce((s, p) => s + p.index, 0) / slice.length;
    const worst = slice.reduce((a, b) => (b.index > a.index ? b : a));
    const reason =
      mean < 20
        ? 'Kondisi relatif tenang'
        : worst.storm
          ? 'Hindari: potensi petir'
          : worst.rain >= worst.heat && worst.rain >= worst.air
            ? 'Kemungkinan hujan'
            : worst.heat >= worst.air
              ? 'Cuaca panas'
              : 'Kualitas udara menurun';
    const end = new Date(new Date(slice[slice.length - 1].time).getTime() + 3_600_000).toISOString();
    candidates.push({ start: slice[0].time, end, index: Math.round(mean), reason });
  }
  candidates.sort((a, b) => a.index - b.index);
  const picked: OutdoorWindow[] = [];
  for (const c of candidates) {
    const overlaps = picked.some((p) => !(c.end <= p.start || c.start >= p.end));
    if (!overlaps) picked.push(c);
    if (picked.length >= maxWindows) break;
  }
  return picked.sort((a, b) => a.start.localeCompare(b.start));
}

export const describeWindow = (w: OutdoorWindow) => `${formatHour(w.start)}–${formatHour(w.end)}`;
