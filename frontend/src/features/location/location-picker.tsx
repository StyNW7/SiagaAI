import { useQuery } from '@tanstack/react-query';
import { Bookmark, Compass, Loader2, LocateFixed, MapPin, Search, Sparkles } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { Input } from '@/components/ui/primitives';
import { CITY_BY_SLUG, EXPLORE_PRESETS } from '@/data/cities';
import { SCENARIOS, type ScenarioId } from '@/data/scenarios';
import { useGeolocation } from '@/hooks/use-geolocation';
import { searchPlaces, type PlaceResult } from '@/services/geo/geocoding';
import { useLocationStore, useSettings } from '@/stores';
import type { UserLocation } from '@/types/domain';
import { cn } from '@/lib/utils';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function LocationPicker({
  open,
  onOpenChange,
  onPicked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPicked?: (l: UserLocation) => void;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const listId = useId();
  const { locate, busy, status } = useGeolocation();
  const setCurrent = useLocationStore((s) => s.setCurrent);
  const saved = useLocationStore((s) => s.saved);
  const setScenario = useSettings((s) => s.setScenario);

  const results = useQuery({
    queryKey: ['places', debounced],
    queryFn: ({ signal }) => searchPlaces(debounced, signal),
    enabled: debounced.trim().length >= 2,
    staleTime: 10 * 60_000,
  });

  const pick = (l: UserLocation) => {
    setScenario(null);
    setCurrent(l);
    onPicked?.(l);
    onOpenChange(false);
    setQuery('');
  };

  const fromPlace = (p: PlaceResult): UserLocation => ({
    id: p.id,
    name: p.name,
    region: p.region.split(', ').pop(),
    provinceCode: p.provinceCode,
    lat: p.lat,
    lon: p.lon,
    source: 'search',
  });

  const startScenario = (id: ScenarioId) => {
    setScenario(id);
    onPicked?.(SCENARIOS[id].location);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Pilih lokasi"
        description="Gunakan GPS, cari kota/kabupaten, atau jelajahi wilayah dengan aktivitas bahaya."
        className="max-w-xl"
      >
        <Button
          className="w-full justify-start"
          size="lg"
          onClick={async () => {
            const l = await locate();
            if (l) {
              onPicked?.(l);
              onOpenChange(false);
            }
          }}
          disabled={busy}
        >
          {busy ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          {status === 'locating'
            ? 'Mendapatkan lokasi…'
            : status === 'resolving'
              ? 'Mengenali wilayah…'
              : 'Gunakan lokasi saya (GPS)'}
        </Button>
        <p className="mt-2 text-[12px] text-muted">
          GPS hanya dipakai sementara untuk analisis; tidak disimpan kecuali Anda memilih "Simpan lokasi".
        </p>

        <div className="relative mt-5">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            autoFocus
            role="combobox"
            aria-expanded={!!results.data?.length}
            aria-controls={listId}
            aria-label="Cari kota atau kabupaten"
            placeholder="Cari kota/kabupaten, mis. Palangka Raya"
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.isFetching && (
            <Loader2
              className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted"
              aria-hidden
            />
          )}
        </div>

        {debounced.trim().length >= 2 && (
          <ul
            id={listId}
            role="listbox"
            className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line"
          >
            {results.data?.length ? (
              results.data.map((p) => (
                <li key={p.id} role="option" aria-selected={false}>
                  <button
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-neutral-50 focus-visible:bg-neutral-50"
                    onClick={() => pick(fromPlace(p))}
                  >
                    <MapPin className="size-4 shrink-0 text-brand" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block truncate text-xs text-muted">{p.region || 'Indonesia'}</span>
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3.5 py-4 text-sm text-muted">
                {results.isFetching ? 'Mencari…' : 'Lokasi tidak ditemukan. Coba nama kota/kabupaten lain.'}
              </li>
            )}
          </ul>
        )}

        {saved.length > 0 && (
          <Group title="Lokasi tersimpan" icon={<Bookmark className="size-3.5" />}>
            <div className="flex flex-wrap gap-2">
              {saved.map((s) => (
                <Chip
                  key={s.id}
                  onClick={() =>
                    pick({
                      id: s.id,
                      name: s.name,
                      region: s.region,
                      provinceCode: s.provinceCode,
                      lat: s.lat,
                      lon: s.lon,
                      source: 'saved',
                    })
                  }
                >
                  {s.name}
                </Chip>
              ))}
            </div>
          </Group>
        )}

        <Group title="Jelajahi wilayah (data live)" icon={<Compass className="size-3.5" />}>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXPLORE_PRESETS.map((p) => {
              const c = CITY_BY_SLUG[p.slug];
              return (
                <button
                  key={p.slug}
                  onClick={() =>
                    pick({
                      id: `preset-${c.slug}`,
                      name: c.name,
                      region: c.province,
                      provinceCode: c.provinceCode,
                      lat: c.lat,
                      lon: c.lon,
                      source: 'preset',
                    })
                  }
                  className="rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <span className="block text-sm font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted">{p.reason}</span>
                </button>
              );
            })}
          </div>
        </Group>

        <Group title="Skenario demonstrasi (simulasi)" icon={<Sparkles className="size-3.5" />}>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.values(SCENARIOS).map((s) => (
              <button
                key={s.id}
                onClick={() => startScenario(s.id)}
                className="rounded-xl border border-indigo-100 bg-ai-soft/50 px-3 py-2.5 text-left transition-colors hover:bg-ai-soft"
              >
                <span className="block text-sm font-semibold">
                  {s.emoji} {s.title}
                </span>
                <span className="block text-xs text-muted">{s.subtitle}</span>
              </button>
            ))}
          </div>
        </Group>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-6">
      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

export function Chip({
  children,
  onClick,
  active,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
        active
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
        className,
      )}
    >
      {children}
    </button>
  );
}
