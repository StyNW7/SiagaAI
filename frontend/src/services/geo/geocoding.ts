/**
 * Location search & reverse geocoding.
 * 1. Curated city list (instant, offline).
 * 2. Open-Meteo Geocoding (GeoNames) restricted to Indonesia.
 * Reverse: Nominatim (OSM) → BigDataCloud → nearest curated city.
 */
import { CITIES } from '@/data/cities';
import { haversineKm, isInIndonesiaBBox } from '@/lib/geo';
import type { GeoPoint } from '@/types/domain';
import { fetchJson } from '../http';
import { provinceAt } from './provinces';

export interface PlaceResult extends GeoPoint {
  id: string;
  name: string;
  region: string;
  provinceCode?: string;
  kind: 'city' | 'place';
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9 ]/g, '');

export function searchLocalCities(query: string, limit = 6): PlaceResult[] {
  const q = norm(query.trim());
  if (!q) return [];
  return CITIES.filter((c) => norm(c.name).includes(q) || norm(c.province).includes(q))
    .sort((a, b) => Number(norm(b.name).startsWith(q)) - Number(norm(a.name).startsWith(q)))
    .slice(0, limit)
    .map((c) => ({
      id: `city-${c.slug}`,
      name: c.name,
      region: c.province,
      provinceCode: c.provinceCode,
      lat: c.lat,
      lon: c.lon,
      kind: 'city',
    }));
}

interface OmGeo {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    admin2?: string;
    country_code: string;
  }[];
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const local = searchLocalCities(query);
  if (query.trim().length < 3) return local;
  try {
    const d = await fetchJson<OmGeo>(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=id&countryCode=ID`,
      { service: 'Geocoding', signal, timeoutMs: 8000 },
    );
    const remote: PlaceResult[] = (d.results ?? [])
      .filter((r) => r.country_code === 'ID')
      .map((r) => ({
        id: `geo-${r.id}`,
        name: r.name.replace(/^Kota |^Kabupaten /, ''),
        region: [r.admin2, r.admin1].filter(Boolean).join(', '),
        lat: r.latitude,
        lon: r.longitude,
        kind: 'place' as const,
      }));
    const seen = new Set(local.map((l) => norm(l.name)));
    return [...local, ...remote.filter((r) => !seen.has(norm(r.name)))].slice(0, 8);
  } catch {
    return local;
  }
}

export interface ReverseResult {
  name: string;
  region: string;
  provinceCode?: string;
}

export function nearestCity(point: GeoPoint) {
  return CITIES.reduce(
    (best, c) => {
      const d = haversineKm(point, c);
      return d < best.d ? { c, d } : best;
    },
    { c: CITIES[0], d: Infinity },
  );
}

export async function reverseGeocode(point: GeoPoint, signal?: AbortSignal): Promise<ReverseResult> {
  const province = await provinceAt(point).catch(() => null);
  const region = province?.name ?? '';

  try {
    const d = await fetchJson<{ address?: Record<string, string> }>(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lon}&zoom=12&accept-language=id`,
      { service: 'Nominatim', signal, timeoutMs: 7000 },
    );
    const a = d.address ?? {};
    const name =
      a.city ||
      a.town ||
      a.municipality ||
      a.county ||
      a.regency ||
      a.suburb ||
      a.village ||
      a.state_district;
    if (name)
      return {
        name: name.replace(/^Kota |^Kabupaten /, ''),
        region: region || a.state || '',
        provinceCode: province?.code,
      };
  } catch {
    /* fall through */
  }

  try {
    const d = await fetchJson<{ city?: string; locality?: string; principalSubdivision?: string }>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${point.lat}&longitude=${point.lon}&localityLanguage=id`,
      { service: 'BigDataCloud', signal, timeoutMs: 7000 },
    );
    const name = d.city || d.locality;
    if (name) return { name, region: region || d.principalSubdivision || '', provinceCode: province?.code };
  } catch {
    /* fall through */
  }

  const { c, d } = nearestCity(point);
  return {
    name: d < 40 ? c.name : isInIndonesiaBBox(point) ? `Sekitar ${c.name}` : 'Lokasi Anda',
    region: region || c.province,
    provinceCode: province?.code ?? c.provinceCode,
  };
}
