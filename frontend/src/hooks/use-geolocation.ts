import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { reverseGeocode } from '@/services/geo/geocoding';
import { useLocationStore, useSettings } from '@/stores';
import type { UserLocation } from '@/types/domain';
import { t } from '@/lib/i18n';

export type GeoStatus = 'idle' | 'locating' | 'resolving' | 'success' | 'denied' | 'unavailable' | 'error';

const messages = (): Partial<Record<GeoStatus, string>> => ({
  denied: t(
    'Izin lokasi ditolak. Anda tetap dapat mencari kota secara manual.',
    'Location permission denied. You can still search for a city manually.',
  ),
  unavailable: t(
    'Lokasi tidak dapat ditentukan perangkat. Coba cari kota secara manual.',
    'Your device could not determine the location. Try searching for a city manually.',
  ),
  error: t(
    'Gagal mendapatkan lokasi. Coba lagi atau cari kota secara manual.',
    'Failed to get your location. Try again or search for a city manually.',
  ),
});

/**
 * Browser geolocation, only after an explicit user action. The fix is used in
 * memory for analysis and is not persisted unless the user saves it.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const setCurrent = useLocationStore((s) => s.setCurrent);
  const setScenario = useSettings((s) => s.setScenario);

  const locate = useCallback(async (): Promise<UserLocation | null> => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      toast.error(messages().unavailable);
      return null;
    }
    setStatus('locating');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12_000,
          maximumAge: 5 * 60_000,
        }),
      );
      setStatus('resolving');
      const point = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const place = await reverseGeocode(point);
      const loc: UserLocation = {
        id: `gps-${Date.now()}`,
        name: place.name,
        region: place.region,
        provinceCode: place.provinceCode,
        ...point,
        source: 'gps',
        accuracyM: pos.coords.accuracy,
      };
      setScenario(null);
      setCurrent(loc);
      setStatus('success');
      toast.success(t(`Lokasi ditemukan: ${loc.name}`, `Location found: ${loc.name}`), {
        description: t(
          'Koordinat presisi tidak disimpan kecuali Anda memilih "Simpan lokasi".',
          'Precise coordinates are not stored unless you choose "Save location".',
        ),
      });
      return loc;
    } catch (e) {
      const code = (e as GeolocationPositionError).code;
      const s: GeoStatus = code === 1 ? 'denied' : code === 2 || code === 3 ? 'unavailable' : 'error';
      setStatus(s);
      toast.error(messages()[s]);
      return null;
    }
  }, [setCurrent, setScenario]);

  return { status, locate, busy: status === 'locating' || status === 'resolving' };
}
