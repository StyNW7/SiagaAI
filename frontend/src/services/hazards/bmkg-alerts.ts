/**
 * Official BMKG information:
 *  - Peringatan Dini Cuaca (nowcast RSS/CAP) via `/api/alerts` proxy (no CORS upstream).
 *  - Gempa terkini M5+ & gempa terbaru (data.bmkg.go.id TEWS, CORS-enabled).
 */
import type { Earthquake, OfficialWarning, Provenance } from '@/types/domain';
import { fetchJson, nowIso } from '../http';

export interface WarningsResponse {
  warnings: OfficialWarning[];
  provenance: Provenance;
}

export async function getOfficialWarnings(signal?: AbortSignal): Promise<WarningsResponse> {
  const d = await fetchJson<{ warnings: OfficialWarning[]; fetchedAt: string; publishedAt?: string }>(
    '/api/alerts',
    {
      service: 'BMKG Nowcast',
      signal,
      timeoutMs: 15_000,
    },
  );
  const now = Date.now();
  return {
    // Drop warnings whose validity has already ended.
    warnings: d.warnings.filter((w) => !w.expiresAt || new Date(w.expiresAt).getTime() > now - 3_600_000),
    provenance: {
      source: 'BMKG — Peringatan Dini Cuaca (Nowcast)',
      issuedAt: d.publishedAt,
      fetchedAt: d.fetchedAt,
      mode: 'live',
      url: 'https://www.bmkg.go.id/alerts/nowcast/id',
    },
  };
}

interface TewsQuake {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Coordinates: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi?: string;
  Dirasakan?: string;
  Shakemap?: string;
}

const parseQuake = (q: TewsQuake): Earthquake => {
  const [lat, lon] = q.Coordinates.split(',').map(Number);
  return {
    id: `${q.DateTime}-${q.Coordinates}`,
    time: new Date(q.DateTime).toISOString(),
    lat,
    lon,
    magnitude: Number(q.Magnitude),
    depthKm: Number.parseFloat(q.Kedalaman),
    region: q.Wilayah,
    potential: q.Potensi ?? '',
    felt: q.Dirasakan,
    shakemapUrl: q.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${q.Shakemap}` : undefined,
  };
};

export interface EarthquakeResponse {
  latest: Earthquake | null;
  significant: Earthquake[];
  provenance: Provenance;
}

export async function getEarthquakes(signal?: AbortSignal): Promise<EarthquakeResponse> {
  const [latest, list] = await Promise.allSettled([
    fetchJson<{ Infogempa: { gempa: TewsQuake } }>('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', {
      service: 'BMKG Gempa',
      signal,
    }),
    fetchJson<{ Infogempa: { gempa: TewsQuake[] } }>(
      'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json',
      { service: 'BMKG Gempa', signal },
    ),
  ]);
  if (latest.status === 'rejected' && list.status === 'rejected') throw latest.reason;
  const l = latest.status === 'fulfilled' ? parseQuake(latest.value.Infogempa.gempa) : null;
  const s = list.status === 'fulfilled' ? list.value.Infogempa.gempa.map(parseQuake) : [];
  return {
    latest: l,
    significant: s,
    provenance: {
      source: 'BMKG — Informasi Gempabumi (TEWS)',
      issuedAt: l?.time ?? s[0]?.time,
      fetchedAt: nowIso(),
      mode: 'live',
      url: 'https://data.bmkg.go.id/gempabumi/',
    },
  };
}
