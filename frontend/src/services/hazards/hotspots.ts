/**
 * NASA FIRMS active-fire / thermal detections (VIIRS NOAA-20, NOAA-21, S-NPP).
 *
 * Live path: `/api/hotspots` — our serverless proxy fetches FIRMS' public NRT CSV
 * feeds (FIRMS does not send CORS headers), filters Indonesia and compacts them.
 * Fallback: a real FIRMS snapshot bundled with the app, always labelled
 * "Snapshot" with its capture time — never presented as live.
 */
import { findProvince } from '@/lib/geo';
import type { Hotspot, HotspotConfidence, HotspotDataset } from '@/types/domain';
import { fetchJson, nowIso } from '../http';
import { loadProvinces } from '../geo/provinces';

/** Compact wire format shared by the API and the bundled snapshot. */
export interface CompactHotspots {
  source: string;
  capturedAt?: string;
  fetchedAt?: string;
  fields: string[];
  rows: [number, number, string, string, string, number, string, string | null][];
}

const CONF: Record<string, HotspotConfidence> = { l: 'low', n: 'nominal', h: 'high' };

async function decode(data: CompactHotspots): Promise<Hotspot[]> {
  const { index } = await loadProvinces();
  const out: Hotspot[] = [];
  for (const [lat, lon, t, sat, conf, frp, dn, p] of data.rows) {
    const provinceCode = p ?? findProvince(index, { lat, lon })?.code ?? null;
    if (!provinceCode) continue; // outside Indonesian land boundaries
    out.push({
      id: `${lat.toFixed(4)}_${lon.toFixed(4)}_${t}`,
      lat,
      lon,
      time: t.length === 16 ? `${t}:00Z` : t,
      satellite: sat,
      confidence: CONF[conf] ?? 'nominal',
      frp,
      dayNight: dn === 'N' ? 'N' : 'D',
      provinceCode,
    });
  }
  return out;
}

const latestOf = (list: Hotspot[]) =>
  list.reduce<string | null>((m, h) => (m == null || h.time > m ? h.time : m), null);

export async function getHotspots(signal?: AbortSignal): Promise<HotspotDataset> {
  try {
    const live = await fetchJson<CompactHotspots>('/api/hotspots?range=7d', {
      service: 'NASA FIRMS',
      signal,
      timeoutMs: 20_000,
    });
    const hotspots = await decode(live);
    return {
      hotspots,
      latestDetection: latestOf(hotspots),
      provenance: {
        source: live.source,
        issuedAt: latestOf(hotspots) ?? undefined,
        fetchedAt: live.fetchedAt ?? nowIso(),
        mode: 'live',
        url: 'https://firms.modaps.eosdis.nasa.gov/',
      },
    };
  } catch (liveError) {
    if (signal?.aborted) throw liveError;
    const snap = await fetchJson<CompactHotspots>('/data/hotspots-snapshot.json', {
      service: 'FIRMS snapshot',
      signal,
    });
    const hotspots = await decode(snap);
    return {
      hotspots,
      latestDetection: latestOf(hotspots),
      provenance: {
        source: `${snap.source} — snapshot`,
        issuedAt: snap.capturedAt,
        fetchedAt: snap.capturedAt ?? nowIso(),
        mode: 'snapshot',
        url: 'https://firms.modaps.eosdis.nasa.gov/',
      },
    };
  }
}

export interface ProvinceHotspotStats {
  code: string;
  total7d: number;
  last24h: number;
  prev24h: number;
  daily: { date: string; count: number }[];
  trend: 'increasing' | 'stable' | 'decreasing';
}

/** Per-province aggregates + daily series (last 7 days) for choropleth and trend sparkline. */
export function aggregateByProvince(
  hotspots: Hotspot[],
  now = Date.now(),
): Map<string, ProvinceHotspotStats> {
  const map = new Map<string, ProvinceHotspotStats>();
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(now - (6 - i) * 86_400_000).toISOString().slice(0, 10),
  );
  for (const h of hotspots) {
    if (!h.provinceCode) continue;
    let s = map.get(h.provinceCode);
    if (!s) {
      s = {
        code: h.provinceCode,
        total7d: 0,
        last24h: 0,
        prev24h: 0,
        daily: days.map((date) => ({ date, count: 0 })),
        trend: 'stable',
      };
      map.set(h.provinceCode, s);
    }
    const age = (now - new Date(h.time).getTime()) / 3_600_000;
    s.total7d++;
    if (age <= 24) s.last24h++;
    else if (age <= 48) s.prev24h++;
    const day = s.daily.find((d) => d.date === h.time.slice(0, 10));
    if (day) day.count++;
  }
  for (const s of map.values()) s.trend = trendOf(s.last24h, s.prev24h);
  return map;
}

export function trendOf(current: number, previous: number): ProvinceHotspotStats['trend'] {
  if (current + previous < 5) return 'stable';
  const ratio = (current + 1) / (previous + 1);
  return ratio >= 1.3 ? 'increasing' : ratio <= 0.77 ? 'decreasing' : 'stable';
}
