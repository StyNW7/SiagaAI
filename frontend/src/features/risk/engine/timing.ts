/**
 * Outdoor activity timing — finds the lower-risk windows in the next 24 h by
 * scoring every forecast hour on rain, thunderstorm, heat and PM2.5.
 * Deterministic; the AI only phrases the result.
 */
import { formatHour } from '@/lib/format';
import { piecewise } from '@/lib/utils';
import { t } from '@/lib/i18n';
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
        ? t('Kondisi relatif tenang', 'Relatively calm conditions')
        : worst.storm
          ? t('Hindari: potensi petir', 'Avoid: possible lightning')
          : worst.rain >= worst.heat && worst.rain >= worst.air
            ? t('Kemungkinan hujan', 'Chance of rain')
            : worst.heat >= worst.air
              ? t('Cuaca panas', 'Hot weather')
              : t('Kualitas udara menurun', 'Declining air quality');
    const end = new Date(new Date(slice[slice.length - 1].time).getTime() + 3_600_000).toISOString();
    candidates.push({ start: slice[0].time, end, index: Math.round(mean), reason });
  }
  // Compare instants, never ISO strings: forecast times and toISOString() use different formats.
  const ms = (iso: string) => new Date(iso).getTime();
  candidates.sort((a, b) => a.index - b.index);
  const picked: OutdoorWindow[] = [];
  for (const c of candidates) {
    const overlaps = picked.some((p) => !(ms(c.end) <= ms(p.start) || ms(c.start) >= ms(p.end)));
    if (!overlaps) picked.push(c);
    if (picked.length >= maxWindows) break;
  }
  picked.sort((a, b) => ms(a.start) - ms(b.start));
  // Back-to-back windows read better as one span ("07:00–13:00", not "07:00–10:00 · 10:00–13:00").
  const merged: OutdoorWindow[] = [];
  for (const w of picked) {
    const prev = merged.at(-1);
    if (prev && ms(w.start) <= ms(prev.end)) {
      const a = ms(prev.end) - ms(prev.start);
      const b = ms(w.end) - ms(w.start);
      merged[merged.length - 1] = {
        start: prev.start,
        end: ms(w.end) > ms(prev.end) ? w.end : prev.end,
        index: Math.round((prev.index * a + w.index * b) / (a + b)),
        reason: prev.index <= w.index ? w.reason : prev.reason,
      };
    } else merged.push(w);
  }
  return merged;
}

export const describeWindow = (w: OutdoorWindow) => `${formatHour(w.start)}–${formatHour(w.end)}`;
