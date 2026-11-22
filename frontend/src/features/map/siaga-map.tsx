import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MlMap,
  type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import type { City } from '@/data/cities';
import type { ProvinceHotspotStats } from '@/services/hazards/hotspots';
import type { PointSnapshot } from '@/services/weather/open-meteo';
import { INDONESIA_BOUNDS, type ProvinceCollection } from '@/lib/geo';
import { formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { weatherIconKey } from '@/lib/weather-codes';
import type { CommunityReport, Earthquake, Hotspot, UserLocation } from '@/types/domain';

export interface MapLayers {
  hotspots: boolean;
  heatmap: boolean;
  risk: boolean;
  weather: boolean;
  warnings: boolean;
  air: boolean;
  community: boolean;
  quakes: boolean;
}

export const DEFAULT_LAYERS: MapLayers = {
  hotspots: true,
  heatmap: true,
  risk: true,
  weather: false,
  warnings: true,
  air: false,
  community: true,
  quakes: false,
};

export type MapFocus =
  | { kind: 'indonesia'; key: number }
  | { kind: 'point'; lat: number; lon: number; zoom?: number; key: number }
  | { kind: 'bounds'; bounds: LngLatBoundsLike; key: number };

interface Props {
  hotspots: Hotspot[];
  provinces?: ProvinceCollection | null;
  provinceStats?: Map<string, ProvinceHotspotStats>;
  warningProvinceCodes?: Set<string>;
  user?: UserLocation | null;
  cities?: { city: City; snapshot: PointSnapshot }[];
  reports?: CommunityReport[];
  quakes?: Earthquake[];
  layers?: MapLayers;
  focus?: MapFocus;
  selectedProvince?: string | null;
  onProvinceClick?: (code: string) => void;
  className?: string;
  compact?: boolean;
  initialView?: { lat: number; lon: number; zoom: number };
  /** Camera padding so overlays (panels) don't cover the area of interest. */
  padding?: { top: number; bottom: number; left: number; right: number };
}

const OFM = 'https://tiles.openfreemap.org/styles/positron';
const CARTO = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const FONT = ['Noto Sans Regular'];

async function loadStyle(): Promise<string | StyleSpecification> {
  for (const url of [OFM, CARTO]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return (await res.json()) as StyleSpecification;
    } catch {
      /* try next */
    }
  }
  // Offline/minimal fallback: plain background — data layers still render.
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#EEF1F4' } }],
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  };
}

const ageHours = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

function hotspotGeoJSON(list: Hotspot[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: list.map((h) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
      properties: {
        age: Math.round(ageHours(h.time) * 10) / 10,
        frp: h.frp,
        conf: h.confidence,
        sat: h.satellite,
        time: h.time,
        dn: h.dayNight,
      },
    })),
  };
}

const FIRE_RAMP = ['step', ['get', 'age'], '#C62A1F', 6, '#E66B24', 24, '#D99A22', 72, '#A8A29E'];

const WX_EMOJI: Record<string, string> = {
  sun: '☀️',
  'cloud-sun': '⛅',
  cloud: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  'heavy-rain': '🌧️',
  storm: '⛈️',
};
const pmColor = (v: number) =>
  v <= 15 ? '#208A61' : v <= 35 ? '#3478C6' : v <= 55 ? '#D99A22' : v <= 150 ? '#E66B24' : '#A51E22';
/** Inline SVG hazard glyphs (Lucide paths) — consistent with the in-app hazard icons, no emoji. */
const svg = (d: string, color: string, size = 15) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const REPORT_COLOR: Record<string, string> = {
  fire: '#D95332',
  smoke: '#73717E',
  flood: '#397EB8',
  weather: '#6F63B5',
};
const REPORT_PATH: Record<string, string> = {
  fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  smoke:
    '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
  flood:
    '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  weather: '<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>',
};
const reportIcon = (h: string, size?: number) =>
  svg(REPORT_PATH[h] ?? REPORT_PATH.weather, REPORT_COLOR[h] ?? '#4E54D8', size);
const REPORT_LABEL: Record<string, string> = {
  fire: 'Kemungkinan api vegetasi',
  smoke: 'Asap',
  flood: 'Jalan tergenang/banjir',
  weather: 'Cuaca ekstrem',
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function SiagaMap({
  hotspots,
  provinces,
  provinceStats,
  warningProvinceCodes,
  user,
  cities,
  reports,
  quakes,
  layers = DEFAULT_LAYERS,
  focus,
  selectedProvince,
  onProvinceClick,
  className,
  compact,
  initialView,
  padding,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const markers = useRef<{
    user?: maplibregl.Marker;
    cities: maplibregl.Marker[];
    reports: maplibregl.Marker[];
  }>({ cities: [], reports: [] });
  const clickRef = useRef(onProvinceClick);
  clickRef.current = onProvinceClick;

  /* ── init ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    let disposed = false;
    let map: MlMap | null = null;
    loadStyle().then((style) => {
      if (disposed || !container.current) return;
      try {
        map = new maplibregl.Map({
          container: container.current,
          style,
          bounds: initialView ? undefined : INDONESIA_BOUNDS,
          center: initialView ? [initialView.lon, initialView.lat] : undefined,
          zoom: initialView?.zoom,
          fitBoundsOptions: { padding: padding ?? 20 },
          attributionControl: false,
          cooperativeGestures: compact,
          maxPitch: 0,
          dragRotate: false,
        });
      } catch {
        setFailed(true);
        return;
      }
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      if (!compact) map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            'Titik panas: NASA FIRMS · Cuaca: BMKG, Open-Meteo · Batas: BAKOSURTANAL/Dukcapil',
        }),
        'bottom-right',
      );

      map.on('load', () => {
        if (!map) return;
        map.addSource('provinces', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          promoteId: 'code',
        });
        map.addSource('hotspots', {
          type: 'geojson',
          data: hotspotGeoJSON([]),
          cluster: true,
          clusterRadius: 42,
          clusterMaxZoom: 8,
        });
        map.addSource('hotspots-raw', { type: 'geojson', data: hotspotGeoJSON([]) });
        map.addSource('quakes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

        map.addLayer({
          id: 'province-fill',
          type: 'fill',
          source: 'provinces',
          paint: {
            'fill-color': [
              'match',
              ['coalesce', ['feature-state', 'level'], 0],
              1,
              '#3478C6',
              2,
              '#D99A22',
              3,
              '#E66B24',
              4,
              '#A51E22',
              '#94A3B8',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              0.28,
              ['boolean', ['feature-state', 'hover'], false],
              0.22,
              ['>', ['coalesce', ['feature-state', 'level'], 0], 0],
              0.13,
              0.02,
            ],
          },
        });
        map.addLayer({
          id: 'province-line',
          type: 'line',
          source: 'provinces',
          paint: {
            'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#171717', '#94A3B8'],
            'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2, 0.6],
            'line-opacity': 0.8,
          },
        });
        map.addLayer({
          id: 'province-warning',
          type: 'line',
          source: 'provinces',
          filter: ['==', ['get', 'code'], '__none__'],
          paint: { 'line-color': '#D99A22', 'line-width': 2.4, 'line-dasharray': [2, 1.5] },
        });
        map.addLayer({
          id: 'hotspot-heat',
          type: 'heatmap',
          source: 'hotspots-raw',
          maxzoom: 9,
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'frp'], 0, 0.2, 30, 0.7, 120, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 9, 2],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 3, 6, 6, 14, 9, 24],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 9, 0],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(255,237,160,0)',
              0.2,
              'rgba(254,217,118,0.6)',
              0.4,
              '#FEB24C',
              0.6,
              '#FD8D3C',
              0.8,
              '#F03B20',
              1,
              '#BD0026',
            ],
          },
        });
        map.addLayer({
          id: 'hotspot-clusters',
          type: 'circle',
          source: 'hotspots',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#FDBA74', 20, '#E66B24', 100, '#C62A1F'],
            'circle-radius': ['step', ['get', 'point_count'], 12, 20, 16, 100, 21, 500, 27],
            'circle-opacity': 0.88,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        });
        map.addLayer({
          id: 'hotspot-cluster-count',
          type: 'symbol',
          source: 'hotspots',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': FONT,
            'text-size': 11,
            'text-allow-overlap': true,
          },
          paint: { 'text-color': '#fff', 'text-halo-color': 'rgba(0,0,0,0.25)', 'text-halo-width': 0.6 },
        });
        map.addLayer({
          id: 'hotspot-points',
          type: 'circle',
          source: 'hotspots',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': FIRE_RAMP as never,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3.5, 10, 6, 14, 9],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#fff',
          },
        });
        map.addLayer({
          id: 'quake-circles',
          type: 'circle',
          source: 'quakes',
          paint: {
            'circle-color': ['step', ['get', 'mag'], '#D99A22', 6, '#E66B24', 7, '#A51E22'],
            'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 4, 6, 6, 11, 8, 20],
            'circle-opacity': 0.35,
            'circle-stroke-width': 2,
            'circle-stroke-color': ['step', ['get', 'mag'], '#D99A22', 6, '#E66B24', 7, '#A51E22'],
          },
        });

        // Interactions
        let hovered: string | null = null;
        map.on('mousemove', 'province-fill', (e) => {
          const id = e.features?.[0]?.id as string | undefined;
          if (!map || id == null) return;
          if (hovered && hovered !== id)
            map.setFeatureState({ source: 'provinces', id: hovered }, { hover: false });
          hovered = id;
          map.setFeatureState({ source: 'provinces', id }, { hover: true });
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'province-fill', () => {
          if (map && hovered) map.setFeatureState({ source: 'provinces', id: hovered }, { hover: false });
          hovered = null;
          if (map) map.getCanvas().style.cursor = '';
        });
        map.on('click', 'province-fill', (e) => {
          if (!map) return;
          const hit = map.queryRenderedFeatures(e.point, {
            layers: ['hotspot-points', 'hotspot-clusters', 'quake-circles'],
          });
          if (hit.length) return;
          const code = e.features?.[0]?.properties?.code as string | undefined;
          if (code) clickRef.current?.(code);
        });
        map.on('click', 'hotspot-clusters', async (e) => {
          const f = e.features?.[0];
          if (!map || !f) return;
          const src = map.getSource('hotspots') as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id as number);
          map.easeTo({
            center: (f.geometry as Point).coordinates as [number, number],
            zoom: Math.min(zoom, 12),
          });
        });
        map.on('click', 'hotspot-points', (e) => {
          const f = e.features?.[0];
          if (!map || !f) return;
          const p = f.properties as {
            age: number;
            frp: number;
            conf: string;
            sat: string;
            time: string;
            dn: string;
          };
          new maplibregl.Popup({ offset: 10, maxWidth: '260px' })
            .setLngLat((f.geometry as Point).coordinates as [number, number])
            .setHTML(
              `<div style="font-size:13px;line-height:1.45">
                <div style="font-weight:700;color:#171717">🔥 Titik Panas Satelit</div>
                <div style="color:#6B6B6B;font-size:11px;margin-bottom:6px">Deteksi termal — bukan konfirmasi kebakaran</div>
                <div><b>${esc(timeAgo(p.time))}</b> · ${esc(formatDateTime(p.time))}</div>
                <div>Satelit ${esc(p.sat)} (VIIRS) · ${p.dn === 'N' ? 'malam' : 'siang'}</div>
                <div>Keyakinan: ${p.conf === 'high' ? 'tinggi' : p.conf === 'low' ? 'rendah' : 'nominal'} · FRP ${p.frp} MW</div>
                <div style="margin-top:6px;color:#6B6B6B;font-size:11px">Sumber: NASA FIRMS</div>
              </div>`,
            )
            .addTo(map);
        });
        map.on('click', 'quake-circles', (e) => {
          const f = e.features?.[0];
          if (!map || !f) return;
          const p = f.properties as {
            mag: number;
            region: string;
            time: string;
            depth: number;
            potential: string;
          };
          new maplibregl.Popup({ offset: 10, maxWidth: '260px' })
            .setLngLat((f.geometry as Point).coordinates as [number, number])
            .setHTML(
              `<div style="font-size:13px;line-height:1.45"><div style="font-weight:700">Gempa M${p.mag}</div><div>${esc(p.region)}</div><div style="color:#6B6B6B">${esc(formatDateTime(p.time))} · kedalaman ${p.depth} km</div><div style="margin-top:4px">${esc(p.potential)}</div><div style="margin-top:6px;color:#6B6B6B;font-size:11px">Sumber: BMKG</div></div>`,
            )
            .addTo(map);
        });
        for (const id of ['hotspot-clusters', 'hotspot-points', 'quake-circles']) {
          map.on('mouseenter', id, () => map && (map.getCanvas().style.cursor = 'pointer'));
          map.on('mouseleave', id, () => map && (map.getCanvas().style.cursor = ''));
        }
        // Keep the compact attribution collapsed so it never covers data.
        container.current
          ?.querySelector('.maplibregl-ctrl-attrib')
          ?.classList.remove('maplibregl-compact-show');
        setReady(true);
      });
    });

    const ro = new ResizeObserver(() => mapRef.current?.resize());
    if (container.current) ro.observe(container.current);
    return () => {
      disposed = true;
      ro.disconnect();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── data sync ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const data = hotspotGeoJSON(hotspots.filter((h) => ageHours(h.time) <= 7 * 24 + 6));
    (map.getSource('hotspots') as GeoJSONSource).setData(data);
    (map.getSource('hotspots-raw') as GeoJSONSource).setData(data);
  }, [ready, hotspots]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !provinces) return;
    (map.getSource('provinces') as GeoJSONSource).setData(provinces as unknown as FeatureCollection);
  }, [ready, provinces]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !provinces) return;
    for (const f of provinces.features) {
      const s = provinceStats?.get(f.properties.code);
      const n = s?.last24h ?? 0;
      const level = n === 0 ? (s?.total7d ? 1 : 0) : n <= 5 ? 1 : n <= 20 ? 2 : n <= 60 ? 3 : 4;
      map.setFeatureState(
        { source: 'provinces', id: f.properties.code },
        { level: layers.risk ? level : 0, selected: f.properties.code === selectedProvince },
      );
    }
  }, [ready, provinces, provinceStats, selectedProvince, layers.risk]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const codes = [...(warningProvinceCodes ?? [])];
    map.setFilter(
      'province-warning',
      codes.length ? ['in', ['get', 'code'], ['literal', codes]] : ['==', ['get', 'code'], '__none__'],
    );
  }, [ready, warningProvinceCodes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('quakes') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: (quakes ?? []).map((q) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [q.lon, q.lat] },
        properties: {
          mag: q.magnitude,
          region: q.region,
          time: q.time,
          depth: q.depthKm,
          potential: q.potential,
        },
      })),
    });
  }, [ready, quakes]);

  /* ── layer visibility ──────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const vis = (id: string, on: boolean) =>
      map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    vis('hotspot-clusters', layers.hotspots);
    vis('hotspot-cluster-count', layers.hotspots);
    vis('hotspot-points', layers.hotspots);
    vis('hotspot-heat', layers.heatmap);
    vis('province-warning', layers.warnings);
    vis('quake-circles', layers.quakes);
  }, [ready, layers]);

  /* ── HTML markers: user, cities (weather/AQ), community ─────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    markers.current.user?.remove();
    if (!user) return;
    const el = document.createElement('div');
    el.className = 'relative grid size-5 place-items-center';
    el.setAttribute('aria-label', `Lokasi Anda: ${user.name}`);
    el.innerHTML =
      '<span class="absolute inset-0 rounded-full bg-[#4E54D8]/40 animate-pulse-ring"></span><span class="relative size-4 rounded-full border-[3px] border-white bg-[#4E54D8] shadow-lg"></span>';
    markers.current.user = new maplibregl.Marker({ element: el })
      .setLngLat([user.lon, user.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 14 }).setHTML(
          `<b>${esc(user.name)}</b><br/><span style="color:#6B6B6B">${esc(user.region ?? '')}</span>`,
        ),
      )
      .addTo(map);
  }, [ready, user]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    markers.current.cities.forEach((m) => m.remove());
    markers.current.cities = [];
    if (!cities || (!layers.weather && !layers.air)) return;
    for (const { city, snapshot: s } of cities) {
      const parts: string[] = [];
      if (layers.weather && s.temperature != null)
        parts.push(
          `<span style="display:inline-flex;align-items:center;gap:3px">${WX_EMOJI[weatherIconKey(s.weatherCode)]}<b>${Math.round(s.temperature)}°</b></span>`,
        );
      if (layers.air && s.pm25 != null)
        parts.push(
          `<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:9px;background:${pmColor(s.pm25)}"></span><b>${Math.round(s.pm25)}</b><span style="color:#6B6B6B;font-size:9px">PM2.5</span></span>`,
        );
      if (!parts.length) continue;
      const el = document.createElement('div');
      el.style.cssText =
        'display:flex;gap:6px;align-items:center;background:#fff;border:1px solid #E6E5E1;border-radius:999px;padding:4px 9px;font:600 11px var(--font-sans);color:#171717;box-shadow:0 2px 6px rgba(0,0,0,.08);white-space:nowrap';
      el.innerHTML = parts.join('<span style="width:1px;height:12px;background:#E5E7EB"></span>');
      el.title = city.name;
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-size:13px;line-height:1.5"><b>${esc(city.name)}</b><div style="color:#6B6B6B;font-size:11px">${esc(city.province)}</div>${s.temperature != null ? `<div>Suhu ${Math.round(s.temperature)}°C · RH ${s.humidity ?? '–'}%</div>` : ''}${s.windSpeed != null ? `<div>Angin ${Math.round(s.windSpeed)} km/jam</div>` : ''}${s.pm25 != null ? `<div>PM2.5 ${Math.round(s.pm25)} µg/m³ (model CAMS)</div>` : ''}<div style="color:#6B6B6B;font-size:11px;margin-top:4px">Sumber: Open-Meteo</div></div>`,
      );
      markers.current.cities.push(
        new maplibregl.Marker({ element: el }).setLngLat([city.lon, city.lat]).setPopup(popup).addTo(map),
      );
    }
  }, [ready, cities, layers.weather, layers.air]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    markers.current.reports.forEach((m) => m.remove());
    markers.current.reports = [];
    if (!layers.community || !reports) return;
    for (const r of reports) {
      const el = document.createElement('button');
      el.style.cssText = `width:32px;height:32px;border-radius:999px;background:#fff;border:2px solid ${REPORT_COLOR[r.hazard] ?? '#4E54D8'};display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.14);cursor:pointer`;
      el.innerHTML = reportIcon(r.hazard);
      el.setAttribute('aria-label', `Laporan komunitas: ${REPORT_LABEL[r.hazard]}`);
      const popup = new maplibregl.Popup({ offset: 16, maxWidth: '260px' }).setHTML(
        `<div style="font-size:13px;line-height:1.45"><div style="display:inline-block;background:#FDF6E8;color:#8A5A0B;font:500 9.5px var(--font-mono);letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:999px;margin-bottom:6px">Laporan warga · belum terverifikasi</div><div style="font-weight:700;display:flex;align-items:center;gap:6px">${reportIcon(r.hazard, 14)} ${esc(REPORT_LABEL[r.hazard])}</div><div>${esc(r.description)}</div><div style="color:#6B6B6B;font-size:11px;margin-top:4px">${esc(r.locationName)} · ${esc(timeAgo(r.createdAt))}${r.isExample ? ' · contoh demo' : ''}</div></div>`,
      );
      markers.current.reports.push(
        new maplibregl.Marker({ element: el }).setLngLat([r.lon, r.lat]).setPopup(popup).addTo(map),
      );
    }
  }, [ready, reports, layers.community]);

  /* ── camera ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    if (focus.kind === 'indonesia')
      map.fitBounds(INDONESIA_BOUNDS, { padding: padding ?? 24, duration: 1400 });
    else if (focus.kind === 'point')
      map.flyTo({
        center: [focus.lon, focus.lat],
        zoom: focus.zoom ?? 9,
        duration: 2200,
        essential: true,
        curve: 1.6,
      });
    else
      map.fitBounds(focus.bounds, {
        padding: compact ? 24 : (padding ?? { top: 60, bottom: 60, left: 40, right: 40 }),
        duration: 1600,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focus?.key]);

  return (
    <div className={cn('relative isolate overflow-hidden bg-[#EEF1F4]', className)}>
      <div
        ref={container}
        style={{ position: 'absolute', inset: 0 }}
        role="application"
        aria-label="Peta interaktif SiagaAI: titik panas, peringatan, cuaca dan laporan komunitas"
      />
      {!ready && !failed && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-muted shadow-soft">
            <span className="size-2 animate-pulse rounded-full bg-brand" /> Memuat peta Nusantara…
          </div>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
          Peta tidak dapat dimuat di perangkat ini (WebGL tidak tersedia). Data risiko tetap tersedia di
          dashboard.
        </div>
      )}
    </div>
  );
}
