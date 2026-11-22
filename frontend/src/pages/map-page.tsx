import { useQuery } from '@tanstack/react-query';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Flame,
  Globe2,
  Layers,
  MapPin,
  Search,
  X,
} from 'lucide-react';
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
import { useDocumentTitle, useMediaQuery, usePersistentToggle } from '@/hooks/use-misc';
import { useSiagaData } from '@/hooks/use-siaga-data';
import { useAssistantStore } from '@/stores';
import { featureBounds } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { loadProvinces } from '@/services/geo/provinces';
import { aggregateByProvince } from '@/services/hazards/hotspots';
import { getMultiPointSnapshot } from '@/services/weather/open-meteo';
import { locale, t } from '@/lib/i18n';

const layerMeta = (): { key: keyof MapLayers; label: string; hint: string; color: string }[] => [
  {
    key: 'hotspots',
    label: t('Titik panas', 'Hotspots'),
    hint: t('NASA FIRMS VIIRS · 7 hari', 'NASA FIRMS VIIRS · 7 days'),
    color: '#E66B24',
  },
  {
    key: 'heatmap',
    label: t('Kepadatan titik panas', 'Hotspot density'),
    hint: t('Heatmap skala nasional', 'National-scale heatmap'),
    color: '#C62A1F',
  },
  {
    key: 'risk',
    label: t('Aktivitas per provinsi', 'Activity by province'),
    hint: t('Choropleth deteksi 24 jam', '24-hour detection choropleth'),
    color: '#D99A22',
  },
  {
    key: 'warnings',
    label: t('Peringatan BMKG', 'BMKG warnings'),
    hint: t('Garis putus-putus = aktif', 'Dashed outline = active'),
    color: '#D99A22',
  },
  {
    key: 'weather',
    label: t('Cuaca kota', 'City weather'),
    hint: t('Suhu & kondisi · Open-Meteo', 'Temperature & conditions · Open-Meteo'),
    color: '#3478C6',
  },
  {
    key: 'air',
    label: t('Kualitas udara', 'Air quality'),
    hint: t('PM2.5 model CAMS', 'PM2.5 CAMS model'),
    color: '#208A61',
  },
  {
    key: 'quakes',
    label: t('Gempabumi', 'Earthquakes'),
    hint: t('BMKG · M5+ terkini', 'BMKG · latest M5+'),
    color: '#A51E22',
  },
  {
    key: 'community',
    label: t('Laporan komunitas', 'Community reports'),
    hint: t('Belum terverifikasi', 'Unverified'),
    color: '#4E54D8',
  },
];

const AGE_LEGEND = (): [string, string][] => [
  ['#C62A1F', t('≤ 6 jam', '≤ 6 h')],
  ['#E66B24', t('6–24 jam', '6–24 h')],
  ['#D99A22', t('1–3 hari', '1–3 days')],
  ['#A8A29E', t('> 3 hari', '> 3 days')],
];

/** Overlays start expanded only when the viewport has room to spare; the user's choice is remembered. */
const roomy = () => typeof window !== 'undefined' && window.innerWidth >= 1280 && window.innerHeight >= 760;
const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024;

export default function MapPage() {
  useDocumentTitle('Siaga Map');
  const { location, hotspots, warnings, earthquakes } = useSiagaData();
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [focus, setFocus] = useState<MapFocus>({ kind: 'indonesia', key: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [deviceKey] = useState(() => (isDesktop() ? 'd' : 'm'));
  const [statsOpen, setStatsOpen] = usePersistentToggle(
    `map-stats-${deviceKey}`,
    isDesktop() && window.innerHeight >= 640,
  );
  // Phones always start with the legend folded — it shares the screen with the summary card.
  const [legendOpen, setLegendOpen] = usePersistentToggle(
    `map-legend-${deviceKey}`,
    roomy(),
    deviceKey === 'm' ? false : undefined,
  );
  // Temporarily folds the summary while a province is open on screens without room for both.
  const [statsSuppressed, setStatsSuppressed] = useState(false);
  const [picker, setPicker] = useState(false);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const wide = useMediaQuery('(min-width: 1600px)');
  const statsVisible = statsOpen && !statsSuppressed;
  const narrowMap = !!selected && desktop && !wide;
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
    // Without room to spare, fold the summary so the province itself stays visible.
    if (!wide) setStatsSuppressed(true);
    setFocus({ kind: 'bounds', bounds: featureBounds(f), key: Date.now() });
  };

  /** While the national view is showing, re-frame it so the archipelago stays clear of the panels. */
  const refitNational = () => {
    if (focus.kind === 'indonesia') setFocus({ kind: 'indonesia', key: Date.now() });
  };

  /** Phones don't have room for several floating panels — opening one folds the others. */
  const foldOthers = (keep: 'stats' | 'layers' | 'legend') => {
    if (desktop) return;
    if (keep !== 'stats') setStatsOpen(false);
    if (keep !== 'layers') setLayersOpen(false);
    if (keep !== 'legend') setLegendOpen(false);
  };

  const toggleLayers = () => {
    if (!layersOpen) foldOthers('layers');
    setLayersOpen(!layersOpen);
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
  const activeLayers = Object.values(layers).filter(Boolean).length;
  const hotspotsLoading = hotspots.state === 'loading';

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
        setStatsSuppressed(false);
      }}
    />
  );

  return (
    <div className="relative flex h-[calc(100dvh-4rem-1px)] overflow-hidden">
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
              ? {
                  top: statsVisible ? 40 : 70,
                  bottom: 90,
                  left: statsVisible ? 370 : 40,
                  right: selected ? 40 : layersOpen ? 300 : 70,
                }
              : // Mobile: the stats panel is a compact pill, and the toolbar + bottom nav sit over the map.
                { top: statsVisible ? 120 : 70, bottom: 190, left: 12, right: 12 }
          }
        />

        {/* Top-left: title + national stats (collapsible so it never hides the map) */}
        <div className="pointer-events-none absolute left-3 right-16 top-3 flex flex-col items-start gap-2 sm:left-4 sm:right-auto">
          {statsVisible ? (
            <section
              className="glass pointer-events-auto max-h-[calc(100dvh-15rem)] w-full overflow-y-auto rounded-[16px] p-4 scrollbar-none animate-fade-up sm:w-[340px] sm:p-5 md:max-h-[calc(100dvh-11rem)]"
              aria-label={t('Ringkasan nasional', 'National summary')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="telemetry flex items-center gap-1.5 !text-brand">
                    <LiveDot /> Indonesia · live
                  </p>
                  <h1 className="mt-0.5 text-[19px] font-bold tracking-[-0.02em]">Siaga Map</h1>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <FreshnessBadge
                    provenance={hotspots.data?.provenance}
                    kind="hotspots"
                    className="hidden sm:inline-flex"
                  />
                  <CollapseButton
                    onClick={() => {
                      setStatsOpen(false);
                      refitNational();
                    }}
                    label={t('Sembunyikan ringkasan', 'Hide summary')}
                    icon={<ChevronUp />}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
                <MiniStat label={t('24 jam', '24 h')} value={hotspotsLoading ? null : total24} />
                <MiniStat label={t('7 hari', '7 days')} value={hotspotsLoading ? null : total7} />
                <MiniStat
                  label={t('Peringatan', 'Warnings')}
                  value={warnings.state === 'loading' ? null : warningList.length}
                />
              </div>
              <div className="mt-3">
                <p className="data-label mb-1.5 flex items-center gap-1.5">
                  <Flame className="size-3.5 text-hz-fire" />{' '}
                  {t('Provinsi teraktif · klik untuk detail', 'Most active provinces · click for details')}
                </p>
                <ul className="space-y-0.5">
                  {topProvinces.map((p, i) => (
                    <li key={p.code} className={cn(i >= 3 && 'hidden sm:block')}>
                      <button
                        onClick={() => selectProvince(p.code)}
                        className={cn(
                          'group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface/80',
                          selected === p.code && 'bg-surface ring-1 ring-line',
                        )}
                      >
                        <span className="grid size-5 shrink-0 place-items-center rounded-md bg-neutral-100 font-mono text-[10px] font-semibold text-muted">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                        <span className="font-mono text-[11.5px] text-subtle">
                          <b className="font-semibold text-ink">{p.last24h}</b> / {p.total7d}
                        </span>
                        <ChevronRight className="size-3.5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </li>
                  ))}
                  {hotspotsLoading &&
                    [0, 1, 2].map((i) => (
                      <li
                        key={i}
                        className="mx-2 my-1.5 h-5 animate-pulse rounded-md bg-neutral-100"
                        aria-hidden
                      />
                    ))}
                  {!hotspotsLoading && !topProvinces.length && (
                    <li className="px-2 text-[12px] text-muted">
                      {hotspots.state === 'error'
                        ? t('Data titik panas belum dapat dimuat.', 'Hotspot data could not be loaded yet.')
                        : t('Tidak ada titik panas terdeteksi.', 'No hotspots detected.')}
                    </li>
                  )}
                </ul>
              </div>
            </section>
          ) : (
            <button
              onClick={() => {
                setStatsOpen(true);
                setStatsSuppressed(false);
                foldOthers('stats');
                refitNational();
              }}
              className="glass pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full py-1.5 pl-3 pr-1.5 text-left transition-transform animate-fade-in hover:-translate-y-px"
              aria-expanded={false}
              aria-label={t('Tampilkan ringkasan Siaga Map', 'Show Siaga Map summary')}
            >
              <LiveDot />
              <span className="shrink-0 text-[13.5px] font-bold tracking-[-0.01em]">Siaga Map</span>
              <span className="h-4 w-px shrink-0 bg-line-strong" aria-hidden />
              <span className="flex min-w-0 items-center gap-1 font-mono text-[11.5px] text-muted">
                <Flame className="size-3.5 shrink-0 text-hz-fire" />
                <b className="font-semibold text-ink">
                  {hotspotsLoading ? '…' : total24.toLocaleString(locale())}
                </b>
                <span className="truncate">/ {t('24 jam', '24 h')}</span>
              </span>
              {warningList.length > 0 && (
                <span className="hidden shrink-0 rounded-full bg-[var(--risk-moderate-soft)] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[var(--risk-moderate-text)] sm:inline">
                  {warningList.length} {t('peringatan', 'warnings')}
                </span>
              )}
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-muted ring-1 ring-line">
                <ChevronDown className="size-4" />
              </span>
            </button>
          )}
        </div>

        {/* Camera journey controls */}
        <div className="glass absolute bottom-24 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-0.5 rounded-full p-1 md:bottom-6">
          <JourneyButton
            compact={narrowMap}
            icon={<Globe2 />}
            label="Indonesia"
            onClick={() => setFocus({ kind: 'indonesia', key: Date.now() })}
          />
          {location.provinceCode && (
            <JourneyButton
              compact={narrowMap}
              icon={<Layers />}
              label={t('Provinsi', 'Province')}
              onClick={() => location.provinceCode && selectProvince(location.provinceCode)}
            />
          )}
          <JourneyButton
            compact={narrowMap}
            icon={<MapPin />}
            label={location.name}
            onClick={() =>
              setFocus({ kind: 'point', lat: location.lat, lon: location.lon, zoom: 9.5, key: Date.now() })
            }
          />
          <JourneyButton
            compact={narrowMap}
            icon={<Crosshair className={busy ? 'animate-spin' : ''} />}
            label="GPS"
            onClick={async () => {
              const l = await locate();
              if (l) setFocus({ kind: 'point', lat: l.lat, lon: l.lon, zoom: 11, key: Date.now() });
            }}
          />
          <JourneyButton
            compact={narrowMap}
            icon={<Search />}
            label={t('Cari', 'Search')}
            onClick={() => setPicker(true)}
          />
        </div>

        {/* Layer control */}
        <div className="absolute right-3 top-[92px] flex flex-col items-end sm:right-4">
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              'glass relative !border-white/70 !bg-surface/85 dark:!border-white/10',
              layersOpen && 'ring-2 ring-brand/40',
            )}
            onClick={toggleLayers}
            aria-expanded={layersOpen}
            aria-label={t('Lapisan peta', 'Map layers')}
          >
            {layersOpen ? <X /> : <Layers />}
            {!layersOpen && (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 font-mono text-[9.5px] font-semibold leading-[18px] text-white ring-2 ring-canvas">
                {activeLayers}
              </span>
            )}
          </Button>
          {layersOpen && (
            <div className="glass mt-2 max-h-[calc(100dvh-27rem)] min-h-40 w-[272px] overflow-y-auto rounded-[16px] p-3 scrollbar-thin animate-fade-up md:max-h-[calc(100dvh-20rem)]">
              <div className="mb-1.5 flex items-center justify-between px-1.5">
                <p className="data-label">{t('Lapisan peta', 'Map layers')}</p>
                <span className="font-mono text-[10.5px] text-subtle">
                  {activeLayers}/{layerMeta().length} {t('aktif', 'on')}
                </span>
              </div>
              <ul>
                {layerMeta().map((l) => (
                  <li key={l.key}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-surface/80">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: l.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold">{l.label}</span>
                        <span className="block truncate font-mono text-[10px] text-subtle">{l.hint}</span>
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
              {cityQ.isFetching && (
                <p className="px-1 pt-1 text-[11px] text-muted">
                  {t('Memuat cuaca kota…', 'Loading city weather…')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Legend (collapsible) — sits above the scale bar */}
        <div className="absolute bottom-40 left-3 md:bottom-11 md:left-4">
          {legendOpen ? (
            <div className="glass w-[180px] rounded-xl px-3.5 py-2.5 text-[11.5px] animate-fade-up">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="data-label">{t('Usia deteksi', 'Detection age')}</p>
                <CollapseButton
                  onClick={() => setLegendOpen(false)}
                  label={t('Sembunyikan legenda', 'Hide legend')}
                  icon={<ChevronDown />}
                  small
                />
              </div>
              {AGE_LEGEND().map(([c, l]) => (
                <p key={l} className="flex items-center gap-2 py-0.5">
                  <span className="size-2.5 rounded-full ring-2 ring-surface" style={{ background: c }} /> {l}
                </p>
              ))}
              <p className="mt-2 border-t border-line pt-2 font-mono text-[10.5px] text-muted">
                {location.lat.toFixed(3)}°, {location.lon.toFixed(3)}°
              </p>
            </div>
          ) : (
            <button
              onClick={() => {
                setLegendOpen(true);
                foldOthers('legend');
              }}
              className="glass flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-2.5 text-[12px] font-semibold text-neutral-700 transition-transform animate-fade-in hover:-translate-y-px"
              aria-expanded={false}
              aria-label={t('Tampilkan legenda usia deteksi', 'Show detection-age legend')}
            >
              <span className="flex -space-x-1" aria-hidden>
                {AGE_LEGEND().map(([c]) => (
                  <span
                    key={c}
                    className="size-2.5 rounded-full ring-2 ring-surface"
                    style={{ background: c }}
                  />
                ))}
              </span>
              {t('Legenda', 'Legend')}
              <ChevronUp className="size-3.5 text-subtle" />
            </button>
          )}
        </div>
      </div>

      {/* Province detail: side panel on desktop, bottom sheet on mobile */}
      {desktop ? (
        panel && (
          <aside className="w-[400px] shrink-0 border-l border-line bg-surface animate-fade-up">
            {panel}
          </aside>
        )
      ) : (
        <DialogPrimitive.Root
          open={panelOpen && !!panel}
          onOpenChange={(v) => {
            setPanelOpen(v);
            if (!v) {
              setSelected(null);
              setStatsSuppressed(false);
            }
          }}
        >
          {panel && (
            <SheetContent
              side="bottom"
              title={selectedFeature?.properties.name ?? t('Provinsi', 'Province')}
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

function LiveDot() {
  return (
    <span className="relative flex size-2 shrink-0" aria-hidden>
      <span className="absolute inset-0 animate-ping rounded-full bg-brand/50" />
      <span className="relative size-2 rounded-full bg-brand" />
    </span>
  );
}

function CollapseButton({
  onClick,
  label,
  icon,
  small,
}: {
  onClick: () => void;
  label: string;
  icon: ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-surface/80 text-muted ring-1 ring-line transition-colors hover:bg-surface hover:text-ink',
        small ? 'size-6 [&_svg]:size-3.5' : 'size-8 [&_svg]:size-4',
      )}
    >
      {icon}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-surface/90 px-3 py-2.5">
      {value === null ? (
        <p className="h-5 w-12 animate-pulse rounded bg-neutral-100" aria-label="…" />
      ) : (
        <p className="display-metric text-[20px]">{value.toLocaleString(locale())}</p>
      )}
      <p className="telemetry mt-1 !text-[10px]">{label}</p>
    </div>
  );
}

function JourneyButton({
  icon,
  label,
  onClick,
  compact,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-neutral-700 transition-colors hover:bg-surface hover:text-ink sm:px-3.5 [&_svg]:size-4 [&_svg]:shrink-0"
      aria-label={label}
      title={label}
    >
      {icon}
      {!compact && <span className="hidden max-w-24 truncate sm:inline">{label}</span>}
    </button>
  );
}
