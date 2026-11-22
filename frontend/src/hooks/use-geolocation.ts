import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { reverseGeocode } from '@/services/geo/geocoding';
import { useLocationStore, useSettings } from '@/stores';
import type { UserLocation } from '@/types/domain';

export type GeoStatus = 'idle' | 'locating' | 'resolving' | 'success' | 'denied' | 'unavailable' | 'error';

const MESSAGES: Partial<Record<GeoStatus, string>> = {
  denied: 'Izin lokasi ditolak. Anda tetap dapat mencari kota secara manual.',
  unavailable: 'Lokasi tidak dapat ditentukan perangkat. Coba cari kota secara manual.',
  error: 'Gagal mendapatkan lokasi. Coba lagi atau cari kota secara manual.',
};

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
      toast.error(MESSAGES.unavailable);
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
      toast.success(`Lokasi ditemukan: ${loc.name}`, {
        description: 'Koordinat presisi tidak disimpan kecuali Anda memilih "Simpan lokasi".',
      });
      return loc;
    } catch (e) {
      const code = (e as GeolocationPositionError).code;
      const s: GeoStatus = code === 1 ? 'denied' : code === 2 || code === 3 ? 'unavailable' : 'error';
      setStatus(s);
      toast.error(MESSAGES[s]);
      return null;
    }
  }, [setCurrent, setScenario]);

  return { status, locate, busy: status === 'locating' || status === 'resolving' };
}
