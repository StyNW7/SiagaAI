/**
 * BMKG Open Data — official Indonesian weather forecast (adm4/kelurahan level,
 * 3-hourly, 3 days). Attribution "Sumber: BMKG" is mandatory and shown in the UI.
 * https://data.bmkg.go.id/prakiraan-cuaca/
 */
import { bmkgToWmo } from '@/lib/weather-codes';
import type { BmkgForecast, BmkgForecastEntry } from '@/types/domain';
import { fetchJson, nowIso } from '../http';

interface BmkgRaw {
  data: {
    lokasi: { adm4: string; desa: string; kecamatan: string; kotkab: string; provinsi: string };
    cuaca: {
      datetime: string;
      local_datetime: string;
      t: number;
      hu: number;
      ws: number;
      wd: string;
      wd_deg: number;
      tcc: number;
      tp: number;
      weather: number;
      weather_desc: string;
      vs_text: string | null;
      image?: string;
      analysis_date?: string;
    }[][];
  }[];
}

const WIND_ID: Record<string, string> = {
  N: 'Utara',
  NE: 'Timur Laut',
  E: 'Timur',
  SE: 'Tenggara',
  S: 'Selatan',
  SW: 'Barat Daya',
  W: 'Barat',
  NW: 'Barat Laut',
};

export async function getBmkgForecast(adm4: string, signal?: AbortSignal): Promise<BmkgForecast> {
  const raw = await fetchJson<BmkgRaw>(
    `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`,
    {
      service: 'BMKG',
      signal,
      timeoutMs: 10_000,
    },
  );
  const block = raw.data?.[0];
  if (!block) throw new Error('BMKG: empty forecast');
  const flat = block.cuaca.flat();
  const entries: BmkgForecastEntry[] = flat.map((c) => ({
    localTime: c.local_datetime,
    utcTime: c.datetime,
    temperature: c.t,
    humidity: c.hu,
    windSpeed: c.ws,
    windDirection: c.wd_deg,
    windDirectionText: WIND_ID[c.wd] ?? c.wd,
    cloudCover: c.tcc,
    precipitation: c.tp,
    weatherCode: bmkgToWmo(c.weather),
    description: c.weather_desc,
    visibilityText: c.vs_text ?? '',
    icon: c.image,
  }));
  const analysis = flat[0]?.analysis_date;
  return {
    adm4: block.lokasi.adm4,
    village: block.lokasi.desa,
    district: block.lokasi.kecamatan,
    city: block.lokasi.kotkab,
    province: block.lokasi.provinsi,
    entries,
    provenance: {
      source: 'BMKG — Prakiraan Cuaca Open Data',
      issuedAt: analysis ? new Date(`${analysis}Z`).toISOString() : undefined,
      fetchedAt: nowIso(),
      mode: 'live',
      url: 'https://data.bmkg.go.id/prakiraan-cuaca/',
    },
  };
}

/** Entry covering "now" (BMKG publishes 3-hour slots). */
export function currentBmkgEntry(f: BmkgForecast, now = Date.now()): BmkgForecastEntry | null {
  let best: BmkgForecastEntry | null = null;
  let bestDiff = Infinity;
  for (const e of f.entries) {
    const diff = Math.abs(new Date(e.utcTime).getTime() - now);
    if (diff < bestDiff) {
      best = e;
      bestDiff = diff;
    }
  }
  return bestDiff <= 3 * 3_600_000 ? best : null;
}
