import { zodResolver } from '@hookform/resolvers/zod';
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  LocateFixed,
  Megaphone,
  ShieldQuestion,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState } from '@/components/common/data-state';
import { PageHeader } from '@/components/common/layout-bits';
import { Button } from '@/components/ui/button';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FieldError,
  Label,
  Textarea,
} from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { blobToDataUrl, compressImage, useCommunityFeed } from '@/features/community/use-community';
import { useActiveLocation } from '@/hooks/use-siaga-data';
import { useDocumentTitle } from '@/hooks/use-misc';
import { formatDateTime, formatDistance, timeAgo } from '@/lib/format';
import { haversineKm } from '@/lib/geo';
import { cn, sanitizeText } from '@/lib/utils';
import { insertCommunityReport, uploadReportImage } from '@/services/supabase/repository';
import { supabase } from '@/services/supabase/client';
import { useAuthStore, useCommunityStore } from '@/stores';
import type { CommunityHazard } from '@/types/domain';

const HAZARD_OPTIONS: { value: CommunityHazard; label: string; emoji: string }[] = [
  { value: 'fire', label: 'Kemungkinan api vegetasi', emoji: '🔥' },
  { value: 'smoke', label: 'Asap', emoji: '💨' },
  { value: 'flood', label: 'Jalan tergenang / banjir', emoji: '🌊' },
  { value: 'weather', label: 'Cuaca ekstrem', emoji: '⛈️' },
];
const EMOJI = Object.fromEntries(HAZARD_OPTIONS.map((h) => [h.value, h.emoji]));
const LABEL = Object.fromEntries(HAZARD_OPTIONS.map((h) => [h.value, h.label]));

const schema = z.object({
  hazard: z.enum(['fire', 'smoke', 'flood', 'weather'], { message: 'Pilih jenis kejadian' }),
  description: z.string().trim().min(15, 'Jelaskan minimal 15 karakter').max(500, 'Maksimal 500 karakter'),
});
type FormValues = z.infer<typeof schema>;

const MAX_IMAGE_MB = 8;

export default function CommunityPage() {
  useDocumentTitle('Komunitas');
  const user = useAuthStore((s) => s.user);
  const location = useActiveLocation();
  const { reports, isRemote } = useCommunityFeed();
  const add = useCommunityStore((s) => s.add);
  const remove = useCommunityStore((s) => s.remove);
  const confirm = useCommunityStore((s) => s.confirm);
  const confirmed = useCommunityStore((s) => s.confirmed);
  const [filter, setFilter] = useState<'all' | 'near'>('all');
  const [image, setImage] = useState<{ blob: Blob; preview: string } | null>(null);
  const [usePrecise, setUsePrecise] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { description: '' } });
  const hazard = form.watch('hazard');

  const onImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('File harus berupa gambar (JPG/PNG/WebP).');
    if (file.size > MAX_IMAGE_MB * 1024 * 1024)
      return toast.error(`Ukuran gambar maksimal ${MAX_IMAGE_MB} MB.`);
    try {
      const blob = await compressImage(file);
      setImage({ blob, preview: await blobToDataUrl(blob) });
    } catch {
      toast.error('Gambar tidak dapat diproses.');
    }
  };

  const useGps = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUsePrecise({
          lat: Math.round(p.coords.latitude * 1000) / 1000,
          lon: Math.round(p.coords.longitude * 1000) / 1000,
        });
        setLocating(false);
        toast.success('Lokasi laporan menggunakan GPS (dibulatkan ±100 m)');
      },
      () => {
        setLocating(false);
        toast.error('Izin lokasi ditolak — laporan memakai lokasi aktif.');
      },
      { timeout: 10_000 },
    );
  };

  const submit = form.handleSubmit(async (v) => {
    if (!user) return;
    const point = usePrecise ?? {
      lat: Math.round(location.lat * 1000) / 1000,
      lon: Math.round(location.lon * 1000) / 1000,
    };
    const payload = {
      hazard: v.hazard,
      description: sanitizeText(v.description, 500),
      locationName: [location.name, location.region].filter(Boolean).join(', '),
      ...point,
      author: user.name.split(' ')[0],
    };
    try {
      if (user.backend === 'supabase') {
        const imageUrl = image ? await uploadReportImage(user.id, image.blob) : undefined;
        const saved = await insertCommunityReport(user.id, { ...payload, imageUrl });
        if (!saved) throw new Error('insert');
      } else {
        add({ ...payload, imageUrl: image?.preview });
      }
      toast.success('Laporan terkirim', {
        description: 'Ditandai "Belum terverifikasi" — terima kasih telah membantu sesama.',
      });
      form.reset({ description: '' });
      setImage(null);
      setUsePrecise(null);
    } catch {
      toast.error('Laporan gagal dikirim. Coba lagi.');
    }
  });

  const shown = filter === 'near' ? reports.filter((r) => haversineKm(location, r) <= 100) : reports;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Megaphone className="size-3.5" /> Community Signal
          </span>
        }
        title="Laporan komunitas"
        description="Warga berbagi kondisi lapangan secara real-time. Setiap laporan ditandai belum terverifikasi dan tidak pernah dianggap data resmi."
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <div>
                <CardTitle>Laporkan kondisi sekitar</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">
                  Lokasi: {location.name}
                  {usePrecise ? ' · GPS' : ''}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {!user ? (
                <EmptyState
                  icon={<Users className="size-5" />}
                  title="Masuk untuk mengirim laporan"
                  description="Login diperlukan untuk mencegah spam. Gunakan akun demo juri bila tersedia."
                  action={
                    <Button asChild>
                      <Link to="/auth?next=/app/community">Masuk / Daftar</Link>
                    </Button>
                  }
                />
              ) : (
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <fieldset>
                    <legend className="mb-2 text-[13px] font-semibold">Jenis kejadian</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {HAZARD_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          aria-pressed={hazard === o.value}
                          onClick={() => form.setValue('hazard', o.value, { shouldValidate: true })}
                          className={cn(
                            'flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition-colors',
                            hazard === o.value
                              ? 'border-ink bg-ink text-white'
                              : 'border-line hover:bg-neutral-50',
                          )}
                        >
                          <span className="text-lg" aria-hidden>
                            {o.emoji}
                          </span>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <FieldError>{form.formState.errors.hazard?.message}</FieldError>
                  </fieldset>
                  <div>
                    <Label htmlFor="desc">Deskripsi</Label>
                    <Textarea
                      id="desc"
                      placeholder="Apa yang Anda lihat? Mis. asap pekat, genangan setinggi lutut…"
                      maxLength={500}
                      {...form.register('description')}
                    />
                    <FieldError>{form.formState.errors.description?.message}</FieldError>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-[13px] font-semibold hover:bg-neutral-50">
                      <ImagePlus className="size-4" /> {image ? 'Ganti foto' : 'Tambah foto'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(e) => onImage(e.target.files?.[0])}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10"
                      onClick={useGps}
                      disabled={locating}
                    >
                      {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Pakai GPS
                    </Button>
                  </div>
                  {image && (
                    <div className="relative overflow-hidden rounded-xl border border-line">
                      <img
                        src={image.preview}
                        alt="Pratinjau foto laporan"
                        className="max-h-52 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImage(null)}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow"
                        aria-label="Hapus foto"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11.5px] leading-relaxed text-muted">
                    Foto dikompres & metadata (termasuk GPS EXIF) dihapus di perangkat sebelum dikirim. Jangan
                    memotret wajah orang tanpa izin.
                  </p>
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Camera />} Kirim
                    laporan
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="near">≤100 km dari {location.name}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Badge variant={isRemote ? 'success' : 'neutral'}>
              {isRemote ? 'Realtime · Supabase' : 'Perangkat ini'}
            </Badge>
          </div>
          {shown.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="size-5" />}
              title="Belum ada laporan di sekitar Anda"
              description="Jadilah yang pertama berbagi kondisi lapangan untuk membantu warga lain."
            />
          ) : (
            <ul className="space-y-3">
              {shown.map((r) => (
                <li key={r.id}>
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-[11px] font-bold text-amber-800">
                      <ShieldQuestion className="size-3.5" /> LAPORAN KOMUNITAS — BELUM TERVERIFIKASI
                      {r.isExample && (
                        <span className="ml-auto rounded bg-white/70 px-1.5 py-0.5 font-semibold text-amber-700">
                          contoh demo
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 p-4">
                      <span
                        className="grid size-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-xl"
                        aria-hidden
                      >
                        {EMOJI[r.hazard]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <h3 className="text-[14px] font-semibold">{LABEL[r.hazard]}</h3>
                          <time
                            className="text-[11.5px] text-muted"
                            dateTime={r.createdAt}
                            title={formatDateTime(r.createdAt)}
                          >
                            {timeAgo(r.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-700">{r.description}</p>
                        {r.imageUrl && (
                          <img
                            src={r.imageUrl}
                            alt={`Foto laporan: ${LABEL[r.hazard]}`}
                            className="mt-3 max-h-60 rounded-xl object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-muted">
                          <span>{r.locationName}</span>
                          <span>· {formatDistance(haversineKm(location, r))} dari Anda</span>
                          <span>· oleh {r.author}</span>
                          <span className="flex-1" />
                          {r.mine ? (
                            <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                              <Trash2 /> Hapus
                            </Button>
                          ) : (
                            <Button
                              variant={confirmed.includes(r.id) ? 'soft' : 'secondary'}
                              size="sm"
                              onClick={() => {
                                confirm(r.id);
                                if (user?.backend === 'supabase' && !r.isExample)
                                  void supabase?.rpc('confirm_report', { report_id: r.id });
                              }}
                              disabled={confirmed.includes(r.id)}
                            >
                              <CheckCircle2 />{' '}
                              {confirmed.includes(r.id) ? 'Dikonfirmasi' : 'Saya juga melihat'} ·{' '}
                              {r.confirmations}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
