import { findProvince, indexProvinces, type IndexedPolygon, type ProvinceCollection } from '@/lib/geo';
import type { GeoPoint } from '@/types/domain';
import { fetchJson } from '../http';

let cache: Promise<{ collection: ProvinceCollection; index: IndexedPolygon[] }> | null = null;

/** Simplified 34-province boundaries (BAKOSURTANAL/Dukcapil via ans-4175/peta-indonesia-geojson, MIT). */
export function loadProvinces() {
  cache ??= fetchJson<ProvinceCollection>('/data/provinces.geojson', { service: 'Batas provinsi' })
    .then((collection) => {
      collection.features.forEach((f, i) => (f.id = i));
      return { collection, index: indexProvinces(collection) };
    })
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

export async function provinceAt(point: GeoPoint) {
  const { index } = await loadProvinces();
  return findProvince(index, point);
}
