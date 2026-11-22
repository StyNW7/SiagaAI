import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { fetchCommunityReports, rowToReport } from '@/services/supabase/repository';
import { supabase } from '@/services/supabase/client';
import { useCommunityStore } from '@/stores';
import type { CommunityReport } from '@/types/domain';

const h = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

/** Clearly-labelled example reports so the feature can be evaluated on a fresh device. */
export const EXAMPLE_REPORTS: CommunityReport[] = [
  {
    id: 'ex-1',
    hazard: 'smoke',
    description: 'Asap tipis tercium sejak pagi di sekitar Jl. Tjilik Riwut, jarak pandang masih cukup baik.',
    locationName: 'Palangka Raya, Kalimantan Tengah',
    lat: -2.185,
    lon: 113.88,
    createdAt: h(3),
    author: 'Warga (contoh)',
    confirmations: 4,
    isExample: true,
  },
  {
    id: 'ex-2',
    hazard: 'flood',
    description: 'Genangan ±20 cm di underpass setelah hujan deras, motor disarankan memutar.',
    locationName: 'Jakarta Utara, DKI Jakarta',
    lat: -6.135,
    lon: 106.86,
    createdAt: h(6),
    author: 'Warga (contoh)',
    confirmations: 7,
    isExample: true,
  },
  {
    id: 'ex-3',
    hazard: 'weather',
    description: 'Angin kencang dan hujan lebat sore hari, beberapa ranting pohon patah di pinggir jalan.',
    locationName: 'Bengkulu, Bengkulu',
    lat: -3.79,
    lon: 102.27,
    createdAt: h(20),
    author: 'Warga (contoh)',
    confirmations: 2,
    isExample: true,
  },
  {
    id: 'ex-4',
    hazard: 'fire',
    description: 'Terlihat api kecil di lahan semak dekat perkebunan, petugas sudah dihubungi.',
    locationName: 'Kampar, Riau',
    lat: 0.33,
    lon: 101.2,
    createdAt: h(28),
    author: 'Warga (contoh)',
    confirmations: 3,
    isExample: true,
  },
];

export function useCommunityFeed() {
  const local = useCommunityStore((s) => s.reports);
  const confirmedIds = useCommunityStore((s) => s.confirmed);
  const qc = useQueryClient();

  const remote = useQuery({
    queryKey: ['community'],
    queryFn: fetchCommunityReports,
    enabled: !!supabase,
    staleTime: 60_000,
  });

  // Supabase Realtime: new reports appear live for everyone.
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('community_reports')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_reports' },
        (payload) => {
          qc.setQueryData<CommunityReport[]>(['community'], (old = []) => [
            rowToReport(payload.new),
            ...old.filter((r) => r.id !== String(payload.new.id)),
          ]);
        },
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [qc]);

  const reports = useMemo(() => {
    const ids = new Set<string>();
    return [...local, ...(remote.data ?? []), ...EXAMPLE_REPORTS]
      .filter((r) => (ids.has(r.id) ? false : (ids.add(r.id), true)))
      .map((r) =>
        confirmedIds.includes(r.id) && r.isExample ? { ...r, confirmations: r.confirmations + 1 } : r,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [local, remote.data, confirmedIds]);

  return { reports, isRemote: !!supabase, loading: remote.isLoading };
}

/** Downscale & re-encode an image client-side (privacy: strips EXIF/GPS metadata). */
export async function compressImage(file: File, maxSide = 1280, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality),
  );
}

export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(b);
  });
