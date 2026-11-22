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
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState } from '@/components/common/data-state';
import { HAZARD_ICONS } from '@/components/common/risk';
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
import { t } from '@/lib/i18n';

const hazardOptions = (): { value: CommunityHazard; label: string; color: string }[] => [
  { value: 'fire', label: t('Api vegetasi', 'Vegetation fire'), color: '#D95332' },
  { value: 'smoke', label: t('Asap', 'Smoke'), color: '#8B899A' },
  { value: 'flood', label: t('Genangan / banjir', 'Waterlogging / flood'), color: '#397EB8' },
  { value: 'weather', label: t('Cuaca ekstrem', 'Extreme weather'), color: '#7D71C8' },
];
const COLOR = Object.fromEntries(hazardOptions().map((h) => [h.value, h.color]));
const label = (h: string) => hazardOptions().find((o) => o.value === h)?.label ?? h;

// Validation messages are functions so they follow the active language.
const schema = z.object({
  hazard: z.enum(['fire', 'smoke', 'flood', 'weather'], {
    error: () => t('Pilih jenis kejadian', 'Choose an event type'),
  }),
  description: z
    .string()
    .trim()
    .min(15, { error: () => t('Jelaskan minimal 15 karakter', 'Describe in at least 15 characters') })
    .max(500, { error: () => t('Maksimal 500 karakter', 'Maximum 500 characters') }),
});
type FormValues = z.infer<typeof schema>;

const MAX_IMAGE_MB = 8;

export default function CommunityPage() {
  useDocumentTitle(t('Komunitas', 'Community'));
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
    if (!file.type.startsWith('image/'))
      return toast.error(
        t('File harus berupa gambar (JPG/PNG/WebP).', 'File must be an image (JPG/PNG/WebP).'),
      );
    if (file.size > MAX_IMAGE_MB * 1024 * 1024)
      return toast.error(
        t(`Ukuran gambar maksimal ${MAX_IMAGE_MB} MB.`, `Maximum image size is ${MAX_IMAGE_MB} MB.`),
      );
    try {
      const blob = await compressImage(file);
      setImage({ blob, preview: await blobToDataUrl(blob) });
    } catch {
      toast.error(t('Gambar tidak dapat diproses.', 'The image could not be processed.'));
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
        toast.success(
          t(
            'Lokasi laporan menggunakan GPS (dibulatkan ±100 m)',
            'Report location uses GPS (rounded to ±100 m)',
          ),
        );
      },
      () => {
        setLocating(false);
        toast.error(
          t(
            'Izin lokasi ditolak — laporan memakai lokasi aktif.',
            'Location permission denied — the report uses your active location.',
          ),
        );
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
      toast.success(t('Laporan terkirim', 'Report sent'), {
        description: t(
          'Ditandai "Belum terverifikasi" — terima kasih telah membantu sesama.',
          'Marked "Unverified" — thank you for helping others.',
        ),
      });
      form.reset({ description: '' });
      setImage(null);
      setUsePrecise(null);
    } catch {
      toast.error(t('Laporan gagal dikirim. Coba lagi.', 'The report failed to send. Please try again.'));
    }
  });

  const shown = filter === 'near' ? reports.filter((r) => haversineKm(location, r) <= 100) : reports;

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Megaphone className="size-3.5" /> Community Signal
          </span>
        }
        title={t('Laporan warga', 'Community reports')}
        description={t(
          'Kondisi lapangan dari sesama warga — selalu ditandai belum terverifikasi.',
          'On-the-ground conditions from fellow residents — always marked as unverified.',
        )}
        mascot="radio"
      />

      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="order-2 min-w-0 lg:col-span-5">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <div>
                <CardTitle>{t('Laporkan kondisi sekitar', 'Report nearby conditions')}</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">
                  {t('Lokasi', 'Location')}: {location.name}
                  {usePrecise ? ' · GPS' : ''}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {!user ? (
                <EmptyState
                  pose="radio"
                  title={t('Masuk untuk mengirim laporan', 'Sign in to send a report')}
                  description={t(
                    'Login mencegah spam. Akun demo tersedia di halaman masuk.',
                    'Signing in prevents spam. A demo account is available on the sign-in page.',
                  )}
                  action={
                    <Button asChild>
                      <Link to="/auth?next=/app/community">{t('Masuk / Daftar', 'Sign in / Register')}</Link>
                    </Button>
                  }
                />
              ) : (
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <fieldset>
                    <legend className="mb-2 text-[13px] font-semibold">
                      {t('Apa yang terjadi?', 'What is happening?')}
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {hazardOptions().map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          aria-pressed={hazard === o.value}
                          onClick={() => form.setValue('hazard', o.value, { shouldValidate: true })}
                          className={cn(
                            'flex min-h-13 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition-colors',
                            hazard === o.value
                              ? 'border-inverse bg-inverse text-on-inverse'
                              : 'border-line bg-surface hover:border-line-strong hover:bg-raised',
                          )}
                        >
                          {(() => {
                            const I = HAZARD_ICONS[o.value];
                            return (
                              <I
                                className="size-[18px] shrink-0"
                                style={{ color: hazard === o.value ? '#fff' : o.color }}
                                aria-hidden
                              />
                            );
                          })()}
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <FieldError>{form.formState.errors.hazard?.message}</FieldError>
                  </fieldset>
                  <div>
                    <Label htmlFor="desc">{t('Deskripsi', 'Description')}</Label>
                    <Textarea
                      id="desc"
                      placeholder={t(
                        'Apa yang Anda lihat? Mis. asap pekat, genangan setinggi lutut…',
                        'What do you see? E.g. thick smoke, knee-deep water…',
                      )}
                      maxLength={500}
                      {...form.register('description')}
                    />
                    <FieldError>{form.formState.errors.description?.message}</FieldError>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line-strong/80 bg-surface px-3.5 text-[13px] font-semibold transition-colors hover:bg-raised">
                      <ImagePlus className="size-4" />{' '}
                      {image ? t('Ganti foto', 'Change photo') : t('Tambah foto', 'Add photo')}
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
                      {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}{' '}
                      {t('Pakai GPS', 'Use GPS')}
                    </Button>
                  </div>
                  {image && (
                    <div className="relative overflow-hidden rounded-xl border border-line">
                      <img
                        src={image.preview}
                        alt={t('Pratinjau foto laporan', 'Report photo preview')}
                        className="max-h-52 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImage(null)}
                        className="absolute right-2 top-2 rounded-full bg-surface/90 p-1.5 shadow"
                        aria-label={t('Hapus foto', 'Remove photo')}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                  <p className="telemetry normal-case leading-relaxed tracking-normal">
                    {t(
                      'Metadata foto (EXIF/GPS) dihapus di perangkat · jangan potret wajah tanpa izin',
                      'Photo metadata (EXIF/GPS) is removed on-device · do not photograph faces without consent',
                    )}
                  </p>
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Camera />}{' '}
                    {t('Kirim laporan', 'Send report')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="order-1 min-w-0 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">{t('Semua', 'All')}</TabsTrigger>
                <TabsTrigger value="near">≤100 km</TabsTrigger>
              </TabsList>
            </Tabs>
            <Badge variant={isRemote ? 'success' : 'neutral'}>
              {isRemote ? 'Realtime · Supabase' : t('Perangkat ini', 'This device')}
            </Badge>
          </div>
          {shown.length === 0 ? (
            <EmptyState
              pose="explore"
              title={t('Belum ada laporan di sekitar', 'No reports nearby yet')}
              description={t(
                'Jadilah yang pertama berbagi kondisi lapangan.',
                'Be the first to share on-the-ground conditions.',
              )}
            />
          ) : (
            <ul className="space-y-3">
              {shown.map((r) => (
                <li key={r.id}>
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 whitespace-nowrap border-b border-line bg-raised px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--risk-moderate-text)] sm:px-5">
                      <ShieldQuestion className="size-3.5 shrink-0" />
                      <span className="truncate">
                        <span className="hidden sm:inline">
                          {t('Laporan warga · ', 'Community report · ')}
                        </span>
                        {t('Belum terverifikasi', 'Unverified')}
                      </span>
                      {r.isExample && (
                        <span className="ml-auto shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-subtle">
                          {t('contoh demo', 'demo example')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 p-5">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-full"
                        style={{ background: `${COLOR[r.hazard]}14`, color: COLOR[r.hazard] }}
                        aria-hidden
                      >
                        {(() => {
                          const I = HAZARD_ICONS[r.hazard];
                          return <I className="size-[18px]" />;
                        })()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <h3 className="text-[15px] font-bold">{label(r.hazard)}</h3>
                          <time
                            className="font-mono text-[11px] text-subtle"
                            dateTime={r.createdAt}
                            title={formatDateTime(r.createdAt)}
                          >
                            {timeAgo(r.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1 text-[14px] leading-relaxed text-neutral-700">{r.description}</p>
                        {r.imageUrl && (
                          <img
                            src={r.imageUrl}
                            alt={`${t('Foto laporan', 'Report photo')}: ${label(r.hazard)}`}
                            className="mt-3 max-h-60 rounded-xl object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-muted">
                          <span>{r.locationName}</span>
                          <span>
                            · {formatDistance(haversineKm(location, r))} {t('dari Anda', 'from you')}
                          </span>
                          <span>
                            · {t('oleh', 'by')} {r.author}
                          </span>
                          <span className="flex-1" />
                          {r.mine ? (
                            <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                              <Trash2 /> {t('Hapus', 'Delete')}
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
                              {confirmed.includes(r.id)
                                ? t('Dikonfirmasi', 'Confirmed')
                                : t('Saya juga melihat', 'I see it too')}{' '}
                              · {r.confirmations}
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
