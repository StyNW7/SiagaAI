import type { GeoPoint } from '@/types/domain';

const R = 6371; // km
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial bearing from a → b, degrees clockwise from north. */
export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest absolute difference between two bearings (0–180). */
export function angularDiff(a: number, b: number): number {
  const d = (((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * A hotspot is "upwind" when it lies in the direction the wind is coming FROM,
 * i.e. smoke from it can be transported toward the user. Tolerance ±45°.
 */
export function isUpwind(user: GeoPoint, source: GeoPoint, windFromDeg: number, toleranceDeg = 45): boolean {
  return angularDiff(bearingDeg(user, source), windFromDeg) <= toleranceDeg;
}

type Ring = number[][];
type Polygon = Ring[];

export function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export interface ProvinceFeature {
  type: 'Feature';
  id?: number;
  properties: { code: string; name: string };
  geometry: { type: 'MultiPolygon'; coordinates: Polygon[] };
}

export interface ProvinceCollection {
  type: 'FeatureCollection';
  features: ProvinceFeature[];
}

export interface IndexedPolygon {
  code: string;
  name: string;
  bbox: [number, number, number, number];
  ring: Ring;
}

function ringBBox(ring: Ring): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

export function indexProvinces(fc: ProvinceCollection): IndexedPolygon[] {
  return fc.features.flatMap((f) =>
    f.geometry.coordinates.map((polygon) => ({
      code: f.properties.code,
      name: f.properties.name,
      bbox: ringBBox(polygon[0]),
      ring: polygon[0],
    })),
  );
}

/** Province containing the point (simplified boundaries, so coastal precision is ~2–3 km). */
export function findProvince(index: IndexedPolygon[], p: GeoPoint): IndexedPolygon | null {
  for (const item of index) {
    const [minX, minY, maxX, maxY] = item.bbox;
    if (p.lon < minX || p.lon > maxX || p.lat < minY || p.lat > maxY) continue;
    if (pointInRing(p.lon, p.lat, item.ring)) return item;
  }
  return null;
}

export function featureBounds(f: ProvinceFeature): [[number, number], [number, number]] {
  const boxes = f.geometry.coordinates.map((polygon) => ringBBox(polygon[0]));
  return [
    [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1]))],
    [Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))],
  ];
}

export const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [94.5, -11.3],
  [141.3, 6.4],
];
export const INDONESIA_CENTER: GeoPoint = { lat: -2.5, lon: 118 };

export const isInIndonesiaBBox = (p: GeoPoint) =>
  p.lat > -11.5 && p.lat < 6.5 && p.lon > 94.5 && p.lon < 141.5;
