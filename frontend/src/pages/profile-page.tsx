import {
  BookOpenText,
  Bookmark,
  ChevronRight,
  HeartHandshake,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Settings,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { AraSays } from '@/components/common/ara';
import { EmptyState } from '@/components/common/data-state';
import { PageHeader } from '@/components/common/layout-bits';
import { RiskBadge } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui/primitives';
import { ScoreHistoryChart } from '@/features/charts/charts';
import { ProfileQuickEdit } from '@/features/profile/profile-quick-edit';
import { useDocumentTitle } from '@/hooks/use-misc';
import { useActiveLocation } from '@/hooks/use-siaga-data';
import { formatDateTime } from '@/lib/format';
import { HAZARDS } from '@/lib/risk-levels';
import { signOut } from '@/services/auth';
import { useAuthStore, useHistoryStore, useLocationStore, useProfileStore, useSettings } from '@/stores';
import { t } from '@/lib/i18n';

export default function ProfilePage() {
  useDocumentTitle(t('Profil', 'Profile'));
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const profile = useProfileStore((s) => s.profile);
  const update = useProfileStore((s) => s.update);
  const { saved, removeSaved, saveLocation, setCurrent } = useLocationStore();
  const setScenario = useSettings((s) => s.setScenario);
  const snapshots = useHistoryStore((s) => s.snapshots);
  const clearHistory = useHistoryStore((s) => s.clear);
  const active = useActiveLocation();
  const real = snapshots.filter((s) => !s.scenario);

  const historyPoints = [...real]
    .reverse()
    .slice(-48)
    .map((s) => ({ time: s.time, score: s.personalScore }));

  return (
    <div>
      <PageHeader
        title={t('Profil & riwayat', 'Profile & history')}
        mascot="tablet"
        description={t('Profil, lokasi tersimpan & riwayat skormu.', 'Your profile, saved locations & score history.')}
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <Card className="relative overflow-hidden">
            <div className="bg-topo absolute inset-0 opacity-[0.04]" aria-hidden />
            <CardContent className="relative flex items-center gap-4 p-5 sm:p-6">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-inverse text-xl font-bold text-on-inverse ring-4 ring-surface">
                {(user?.name ?? profile.displayName ?? 'T').charAt(0).toUpperCase() || 'T'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold tracking-[-0.01em]">
                  {user?.name ?? t('Mode tamu', 'Guest mode')}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {user ? user.email : t('Fitur inti tetap bisa dipakai', 'Core features still work')}
                </p>
                {user && (
                  <Badge className="mt-1.5" variant={user.backend === 'supabase' ? 'success' : 'neutral'}>
                    {user.backend === 'supabase' ? t('Tersinkron Supabase', 'Synced with Supabase') : t('Akun perangkat', 'Device account')}
                  </Badge>
                )}
              </div>
              {user ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await signOut(user);
                    setUser(null);
                    toast.success(t('Anda telah keluar', 'You have signed out'));
                  }}
                >
                  <LogOut /> {t('Keluar', 'Sign out')}
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/auth?next=/app/profile">
                    <LogIn /> {t('Masuk', 'Sign in')}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4 text-brand" /> {t('Konteks personal', 'Personal context')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="display-name">{t('Nama panggilan (opsional)', 'Nickname (optional)')}</Label>
                <Input
                  id="display-name"
                  value={profile.displayName}
                  maxLength={30}
                  onChange={(e) => update({ displayName: e.target.value })}
                  placeholder={t('mis. Raka', 'e.g. Raka')}
                />
              </div>
              <ProfileQuickEdit />
            </CardContent>
          </Card>

          <Card className="md:hidden">
            <CardContent className="divide-y divide-line p-2">
              {[
                { to: '/app/family', label: t('Keluarga', 'Family'), icon: HeartHandshake },
                { to: '/app/community', label: t('Laporan komunitas', 'Community reports'), icon: Megaphone },
                { to: '/app/settings', label: t('Pengaturan', 'Settings'), icon: Settings },
                { to: '/app/about', label: t('Data & Metodologi', 'Data & Methodology'), icon: BookOpenText },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-3.5 text-[14px] font-semibold transition-colors hover:bg-raised"
                >
                  <l.icon className="size-4 text-muted" /> {l.label}
                  <ChevronRight className="ml-auto size-4 text-muted" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-7">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark className="size-4 text-brand" /> {t('Lokasi tersimpan', 'Saved locations')}
                </CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">{t('Hanya atas pilihanmu', 'Only by your choice')}</p>
              </div>
              {active.source !== 'saved' && !active.id.startsWith('scenario') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    saveLocation(active);
                    toast.success(t(`${active.name} disimpan`, `${active.name} saved`));
                  }}
                >
                  <Bookmark /> <span className="max-w-32 truncate">
                    {t('Simpan', 'Save')} {active.name}
                  </span>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {saved.length ? (
                <ul className="divide-y divide-line">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <MapPin className="size-4 shrink-0 text-brand" />
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          setScenario(null);
                          setCurrent({
                            id: s.id,
                            name: s.name,
                            region: s.region,
                            provinceCode: s.provinceCode,
                            lat: s.lat,
                            lon: s.lon,
                            source: 'saved',
                          });
                          toast.success(t(`Lokasi aktif: ${s.name}`, `Active location: ${s.name}`));
                        }}
                      >
                        <span className="block truncate text-[14px] font-semibold">{s.name}</span>
                        <span className="block font-mono text-[10.5px] uppercase tracking-[0.04em] text-subtle">
                          {s.region}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${t('Hapus', 'Remove')} ${s.name}`}
                        onClick={() => removeSaved(s.id)}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <AraSays pose="map" size={80} title={t('Belum ada lokasi tersimpan', 'No saved locations yet')}>
                  {t('Simpan rumah, kampus, atau kantor untuk akses cepat.', 'Save your home, campus, or office for quick access.')}
                </AraSays>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t('Riwayat Siaga Score', 'Siaga Score history')}</CardTitle>
                <p className="telemetry mt-1 normal-case tracking-normal">
                  {t('1 catatan/lokasi/jam · koordinat ±1 km', '1 record/location/hour · coordinates ±1 km')}
                </p>
              </div>
              {real.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <Trash2 /> {t('Hapus', 'Clear')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {historyPoints.length >= 2 ? <ScoreHistoryChart points={historyPoints} /> : null}
              {real.length ? (
                <ul className="mt-3 divide-y divide-line">
                  {real.slice(0, 8).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{s.locationName}</span>
                        <span className="font-mono text-[11px] text-subtle">
                          {formatDateTime(s.time)} · {t('utama', 'main')} {HAZARDS[s.primaryHazard].label.toLowerCase()}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="display-metric text-[20px]">{s.personalScore}</span>
                        <RiskBadge level={s.level} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  pose="thinking"
                  title={t('Riwayat masih kosong', 'No history yet')}
                  description={t(
                    'Terbentuk otomatis saat kamu memantau lokasi dari waktu ke waktu.',
                    'Builds up automatically as you monitor locations over time.',
                  )}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
