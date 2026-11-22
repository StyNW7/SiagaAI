import { useQuery } from '@tanstack/react-query';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Crosshair, Flame, Globe2, Layers, MapPin, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FreshnessBadge } from '@/components/common/data-state';
import { Button } from '@/components/ui/button';
import { SheetContent, Switch } from '@/components/ui/overlays';
import { CITIES } from '@/data/cities';
import { ProvincePanel } from '@/features/map/province-panel';
import { DEFAULT_LAYERS, SiagaMap, type MapFocus, type MapLayers } from '@/features/map/siaga-map';
import { LocationPicker } from '@/features/location/location-picker';
import { normalizeProvince, warningsForProvince } from '@/features/risk/engine/signals';
import { useCommunityFeed } from '@/features/community/use-community';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useDocumentTitle, useMediaQuery } from '@/hooks/use-misc';
import { useSiagaData } from '@/hooks/use-siaga-data';
import { useAssistantStore } from '@/stores';
import { featureBounds } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { loadProvinces } from '@/services/geo/provinces';
import { aggregateByProvince } from '@/services/hazards/hotspots';
import { getMultiPointSnapshot } from '@/services/weather/open-meteo';

const LAYER_META: { key: keyof MapLayers; label: string; hint: string; color: string }[] = [
  { key: 'hotspots', label: 'Titik panas', hint: 'NASA FIRMS VIIRS · 7 hari', color: '#F97316' },
  { key: 'heatmap', label: 'Kepadatan titik panas', hint: 'Heatmap skala nasional', color: '#DC2626' },
  { key: 'risk', label: 'Aktivitas per provinsi', hint: 'Choropleth deteksi 24 jam', color: '#F59E0B' },
  { key: 'warnings', label: 'Peringatan BMKG', hint: 'Garis putus-putus = aktif', color: '#F59E0B' },
  { key: 'weather', label: 'Cuaca kota', hint: 'Suhu & kondisi · Open-Meteo', color: '#2563EB' },
  { key: 'air', label: 'Kualitas udara', hint: 'PM2.5 model CAMS', color: '#16A34A' },
  { key: 'quakes', label: 'Gempabumi', hint: 'BMKG · M5+ terkini', color: '#991B1B' },
  { key: 'community', label: 'Laporan komunitas', hint: 'Belum terverifikasi', color: '#4F46E5' },
];

export default function MapPage() {
  useDocumentTitle('Siaga Map');
  const { location, hotspots, warnings, earthquakes } = useSiagaData();
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [focus, setFocus] = useState<MapFocus>({ kind: 'indonesia', key: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(() => window.innerWidth >= 1440);
  const [picker, setPicker] = useState(false);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const { locate, busy } = useGeolocation();
  const { reports } = useCommunityFeed();
  const setOffsetRight = useAssistantStore((s) => s.setOffsetRight);
  useEffect(() => {
    setOffsetRight(desktop && selected ? 400 : 0);
    return () => setOffsetRight(0);
  }, [desktop, selected, setOffsetRight]);

  const provincesQ = useQuery({ queryKey: ['provinces'], queryFn: loadProvinces, staleTime: Infinity });
  const provinces = provincesQ.data?.collection ?? null;
  const stats = useMemo(() => aggregateByProvince(hotspots.data?.hotspots ?? []), [hotspots.data]);

  const warningList = useMemo(() => warnings.data?.warnings ?? [], [warnings.data]);
  const warningCodes = useMemo(() => {
    if (!provinces) return new Set<string>();
    const names = new Set(warningList.map((w) => (w.province ? normalizeProvince(w.province) : '')));
    return new Set(
      provinces.features
        .filter((f) => names.has(normalizeProvince(f.properties.name)))
        .map((f) => f.properties.code),
    );
  }, [provinces, warningList]);

  const capitals = useMemo(() => CITIES.filter((c) => c.capital), []);
  const cityQ = useQuery({
    queryKey: ['multi-snapshot'],
    queryFn: ({ signal }) => getMultiPointSnapshot(capitals, signal),
    enabled: layers.weather || layers.air,
    staleTime: 30 * 60_000,
  });
  const cities = useMemo(
    () => (cityQ.data ? capitals.map((city, i) => ({ city, snapshot: cityQ.data[i] })) : undefined),
    [cityQ.data, capitals],
  );

  const selectedFeature = provinces?.features.find((f) => f.properties.code === selected);

  const selectProvince = (code: string) => {
    const f = provinces?.features.find((x) => x.properties.code === code);
    if (!f) return;
    setSelected(code);
    setPanelOpen(true);
    setLayersOpen(false);
    setFocus({ kind: 'bounds', bounds: featureBounds(f), key: Date.now() });
  };

  const topProvinces = useMemo(
    () =>
      [...stats.values()]
        .sort((a, b) => b.last24h - a.last24h || b.total7d - a.total7d)
        .slice(0, 5)
        .map((s) => ({
          ...s,
          name: provinces?.features.find((f) => f.properties.code === s.code)?.properties.name ?? s.code,
        })),
    [stats, provinces],
  );

  const total24 = [...stats.values()].reduce((s, x) => s + x.last24h, 0);
  const total7 = [...stats.values()].reduce((s, x) => s + x.total7d, 0);

  const panel = selected && selectedFeature && (
    <ProvincePanel
      code={selected}
      name={selectedFeature.properties.name}
      stats={stats.get(selected)}
      warnings={warningsForProvince(warningList, selectedFeature.properties.name)}
      hotspots={hotspots.data?.hotspots ?? []}
      onClose={() => {
        setPanelOpen(false);
        setSelected(null);
      }}
    />
  );

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] overflow-hidden">
      <div className="relative flex-1">
        <SiagaMap
          className="absolute inset-0"
          hotspots={hotspots.data?.hotspots ?? []}
          provinces={provinces}
          provinceStats={stats}
          warningProvinceCodes={layers.warnings ? warningCodes : undefined}
          user={location}
          cities={cities}
          reports={reports}
          quakes={earthquakes.data?.significant}
          layers={layers}
          focus={focus}
          selectedProvince={selected}
          onProvinceClick={selectProvince}
          padding={
            desktop
              ? { top: 40, bottom: 90, left: 370, right: selected ? 40 : 290 }
              : { top: 140, bottom: 110, left: 16, right: 16 }
          }
        />

        {/* Top-left: title + national stats */}
        <div className="pointer-events-none absolute left-3 right-14 top-3 flex flex-col gap-2 sm:left-4 sm:right-auto sm:w-[340px]">
          <div className="pointer-events-auto rounded-2xl border border-line bg-white/95 p-4 shadow-lift backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-[17px] font-bold">Siaga Map</h1>
                <p className="text-[12px] text-muted">Klik provinsi untuk ringkasan regional</p>
              </div>
              <FreshnessBadge provenance={hotspots.data?.provenance} kind="hotspots" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="24 jam" value={total24} />
              <MiniStat label="7 hari" value={total7} />
              <MiniStat label="Peringatan" value={warningList.length} />
            </div>
            <div className="mt-3 hidden sm:block">
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                <Flame className="size-3 text-orange-500" /> Provinsi teraktif
              </p>
              <ul className="space-y-1">
                {topProvinces.map((p) => (
                  <li key={p.code}>
                    <button
                      onClick={() => selectProvince(p.code)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-neutral-100"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="tabular text-[12px] text-muted">
                        <b className="text-ink">{p.last24h}</b> / {p.total7d}
                      </span>
                    </button>
                  </li>
                ))}
                {!topProvinces.length && (
                  <li className="px-2 text-[12px] text-muted">Tidak ada titik panas terdeteksi.</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Camera journey controls */}
        <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-white/95 p-1 shadow-lift backdrop-blur md:bottom-6">
          <JourneyButton
            icon={<Globe2 />}
            label="Indonesia"
            onClick={() => setFocus({ kind: 'indonesia', key: Date.now() })}
          />
          {location.provinceCode && (
            <JourneyButton
              icon={<Layers />}
              label="Provinsi"
              onClick={() => location.provinceCode && selectProvince(location.provinceCode)}
            />
          )}
          <JourneyButton
            icon={<MapPin />}
            label={location.name}
            onClick={() =>
              setFocus({ kind: 'point', lat: location.lat, lon: location.lon, zoom: 9.5, key: Date.now() })
            }
          />
          <JourneyButton
            icon={<Crosshair className={busy ? 'animate-spin' : ''} />}
            label="GPS"
            onClick={async () => {
              const l = await locate();
              if (l) setFocus({ kind: 'point', lat: l.lat, lon: l.lon, zoom: 11, key: Date.now() });
            }}
          />
          <JourneyButton icon={<Search />} label="Cari" onClick={() => setPicker(true)} />
        </div>

        {/* Layer control */}
        <div className="absolute right-3 top-[104px] sm:right-4">
          <Button
            variant="secondary"
            size="icon"
            className="ml-auto flex shadow-lift"
            onClick={() => setLayersOpen((v) => !v)}
            aria-expanded={layersOpen}
            aria-label="Lapisan peta"
          >
            <Layers />
          </Button>
          <div
            className={cn(
              'mt-2 w-64 rounded-2xl border border-line bg-white/95 p-3 shadow-lift backdrop-blur',
              layersOpen ? 'block animate-fade-up' : 'hidden',
            )}
          >
            <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">Lapisan</p>
            <ul>
              {LAYER_META.map((l) => (
                <li key={l.key}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-neutral-50">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: l.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold">{l.label}</span>
                      <span className="block truncate text-[11px] text-muted">{l.hint}</span>
                    </span>
                    <Switch
                      checked={layers[l.key]}
                      onCheckedChange={(v) => setLayers((s) => ({ ...s, [l.key]: v }))}
                      aria-label={l.label}
                    />
                  </label>
                </li>
              ))}
            </ul>
            {cityQ.isFetching && <p className="px-1 pt-1 text-[11px] text-muted">Memuat cuaca kota…</p>}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-40 left-3 hidden rounded-xl border border-line bg-white/95 px-3 py-2 text-[11px] shadow-soft sm:block md:bottom-6">
          <p className="mb-1 font-bold text-muted">Usia deteksi</p>
          {[
            ['#DC2626', '≤ 6 jam'],
            ['#F97316', '6–24 jam'],
            ['#F59E0B', '1–3 hari'],
            ['#A8A29E', '> 3 hari'],
          ].map(([c, l]) => (
            <p key={l} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full ring-2 ring-white" style={{ background: c }} /> {l}
            </p>
          ))}
        </div>
      </div>

      {/* Province detail: side panel on desktop, bottom sheet on mobile */}
      {desktop ? (
        panel && (
          <aside className="w-[400px] shrink-0 border-l border-line bg-white animate-fade-up">{panel}</aside>
        )
      ) : (
        <DialogPrimitive.Root
          open={panelOpen && !!panel}
          onOpenChange={(v) => (setPanelOpen(v), !v && setSelected(null))}
        >
          {panel && (
            <SheetContent
              side="bottom"
              title={selectedFeature?.properties.name ?? 'Provinsi'}
              hideTitle
              className="h-[80dvh]"
            >
              {panel}
            </SheetContent>
          )}
        </DialogPrimitive.Root>
      )}

      <LocationPicker
        open={picker}
        onOpenChange={setPicker}
        onPicked={(l) => setFocus({ kind: 'point', lat: l.lat, lon: l.lon, zoom: 9.5, key: Date.now() })}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-neutral-50 py-2">
      <p className="tabular text-[18px] font-bold leading-none">{value.toLocaleString('id-ID')}</p>
      <p className="mt-1 text-[10.5px] font-medium text-muted">{label}</p>
    </div>
  );
}

function JourneyButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-100 [&_svg]:size-4"
      aria-label={label}
    >
      {icon}
      <span className="hidden max-w-24 truncate sm:inline">{label}</span>
    </button>
  );
}
