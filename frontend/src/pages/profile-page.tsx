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

export default function ProfilePage() {
  useDocumentTitle('Profil');
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
    <div className="animate-fade-up">
      <PageHeader
        title="Profil & riwayat"
        description="Konteks personal untuk analisis risiko, lokasi tersimpan, dan riwayat Siaga Score Anda."
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink text-xl font-bold text-white">
                {(user?.name ?? profile.displayName ?? 'T').charAt(0).toUpperCase() || 'T'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold">{user?.name ?? 'Mode tamu'}</p>
                <p className="truncate text-[13px] text-muted">
                  {user ? user.email : 'Semua fitur inti tersedia tanpa login'}
                </p>
                {user && (
                  <Badge className="mt-1" variant={user.backend === 'supabase' ? 'success' : 'neutral'}>
                    {user.backend === 'supabase' ? 'Tersinkron Supabase' : 'Akun perangkat'}
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
                    toast.success('Anda telah keluar');
                  }}
                >
                  <LogOut /> Keluar
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/auth?next=/app/profile">
                    <LogIn /> Masuk
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4 text-muted" /> Konteks personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="display-name">Nama panggilan (opsional)</Label>
                <Input
                  id="display-name"
                  value={profile.displayName}
                  maxLength={30}
                  onChange={(e) => update({ displayName: e.target.value })}
                  placeholder="mis. Raka"
                />
              </div>
              <ProfileQuickEdit />
            </CardContent>
          </Card>

          <Card className="md:hidden">
            <CardContent className="divide-y divide-line p-2">
              {[
                { to: '/app/family', label: 'Keluarga', icon: HeartHandshake },
                { to: '/app/community', label: 'Laporan komunitas', icon: Megaphone },
                { to: '/app/settings', label: 'Pengaturan', icon: Settings },
                { to: '/app/about', label: 'Data & Metodologi', icon: BookOpenText },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="flex items-center gap-3 px-3 py-3.5 text-[14px] font-semibold"
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
                  <Bookmark className="size-4 text-muted" /> Lokasi tersimpan
                </CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">Disimpan hanya atas pilihan Anda</p>
              </div>
              {active.source !== 'saved' && !active.id.startsWith('scenario') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    saveLocation(active);
                    toast.success(`${active.name} disimpan`);
                  }}
                >
                  <Bookmark /> Simpan {active.name}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {saved.length ? (
                <ul className="divide-y divide-line">
                  {saved.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
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
                          toast.success(`Lokasi aktif: ${s.name}`);
                        }}
                      >
                        <span className="block truncate text-[14px] font-semibold">{s.name}</span>
                        <span className="block text-[12px] text-muted">{s.region}</span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus ${s.name}`}
                        onClick={() => removeSaved(s.id)}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">
                  Belum ada lokasi tersimpan. Simpan rumah, kampus, atau tempat kerja untuk akses cepat.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Riwayat Siaga Score</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">
                  Satu catatan per lokasi per jam · koordinat dibulatkan ±1 km
                </p>
              </div>
              {real.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearHistory}>
                  <Trash2 /> Hapus
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
                        <span className="text-[12px] text-muted">
                          {formatDateTime(s.time)} · utama {HAZARDS[s.primaryHazard].label.toLowerCase()}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular font-semibold">{s.personalScore}</span>
                        <RiskBadge level={s.level} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<UserRound className="size-5" />}
                  title="Riwayat masih kosong"
                  description="Riwayat terbentuk otomatis saat Anda memantau lokasi dari waktu ke waktu."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
