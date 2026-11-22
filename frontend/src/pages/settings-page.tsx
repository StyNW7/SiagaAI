import { useQuery } from '@tanstack/react-query';
import { BellRing, Database, FlaskConical, Server, Sparkles, Trash2, Type } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/layout-bits';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/overlays';
import { SCENARIOS } from '@/data/scenarios';
import { Chip } from '@/features/location/location-picker';
import { useDocumentTitle } from '@/hooks/use-misc';
import { isSupabaseEnabled } from '@/services/supabase/client';
import { useSettings } from '@/stores';

export default function SettingsPage() {
  useDocumentTitle('Pengaturan');
  const s = useSettings();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const r = await fetch('/api/health');
      if (!r.ok) throw new Error();
      return (await r.json()) as { ai: string[]; firms: string };
    },
    retry: 0,
  });

  const toggleNotifications = async (on: boolean) => {
    if (!on) return s.setNotifications(false);
    if (typeof Notification === 'undefined') return toast.error('Perangkat ini tidak mendukung notifikasi.');
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      s.setNotifications(true);
      const reg = await navigator.serviceWorker?.getRegistration();
      const opts = {
        body: 'Notifikasi aktif. Anda akan diberi tahu saat ada peringatan penting untuk lokasi Anda.',
        icon: '/icons/icon-192.png',
      };
      if (reg) reg.showNotification('SiagaAI', opts);
      else new Notification('SiagaAI', opts);
    } else toast.error('Izin notifikasi ditolak di browser.');
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Pengaturan"
        description="Aksesibilitas, notifikasi, mode demonstrasi, dan status integrasi."
      />
      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="size-4 text-muted" /> Ukuran teks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                [1, 'Normal'],
                [1.125, 'Besar'],
                [1.25, 'Sangat besar'],
              ].map(([v, l]) => (
                <Chip key={l} active={s.textScale === v} onClick={() => s.setTextScale(v as number)}>
                  {l}
                </Chip>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-muted">
              Membantu pengguna lansia & pengguna dengan gangguan penglihatan.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4 text-muted" /> Notifikasi peringatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center justify-between gap-4">
              <span className="text-[13.5px]">
                Beri tahu saya untuk peringatan Kritis & Peringatan di lokasi aktif
              </span>
              <Switch
                checked={s.notifications}
                onCheckedChange={toggleNotifications}
                aria-label="Notifikasi peringatan"
              />
            </label>
            <p className="mt-3 text-[12.5px] text-muted">
              Notifikasi lokal PWA saat aplikasi terbuka/di latar. Push server (web push) adalah pengembangan
              berikutnya.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-ai" /> Mode skenario (demonstrasi)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[13px] text-muted">
              Data simulasi untuk menguji perilaku risiko tinggi dari mana saja. Selalu ditandai jelas sebagai
              simulasi.
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip active={!s.scenario} onClick={() => s.setScenario(null)}>
                Data live
              </Chip>
              {Object.values(SCENARIOS).map((sc) => (
                <Chip key={sc.id} active={s.scenario === sc.id} onClick={() => s.setScenario(sc.id)}>
                  {sc.emoji} {sc.title}
                </Chip>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4 text-muted" /> Status integrasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[13px]">
            <Row
              icon={<Sparkles className="size-4 text-ai" />}
              label="AI gateway (LLM)"
              value={
                health.data
                  ? health.data.ai.length
                    ? `Aktif: ${health.data.ai.join(', ')}`
                    : 'Local Reasoner (kunci LLM belum diatur)'
                  : health.isError
                    ? 'Local Reasoner (gateway tidak terjangkau)'
                    : 'Memeriksa…'
              }
              ok={!!health.data?.ai.length}
            />
            <Row
              icon={<Database className="size-4" />}
              label="NASA FIRMS"
              value={
                health.data
                  ? health.data.firms === 'area-api'
                    ? 'Area API (MAP_KEY)'
                    : 'Feed publik NRT'
                  : health.isError
                    ? 'Snapshot'
                    : 'Memeriksa…'
              }
              ok={!!health.data}
            />
            <Row
              icon={<Database className="size-4" />}
              label="Supabase (akun & sinkronisasi)"
              value={isSupabaseEnabled ? 'Terhubung' : 'Mode perangkat (localStorage)'}
              ok={isSupabaseEnabled}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="size-4 text-muted" /> Privasi & data
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-[13px] text-muted">
              GPS presisi tidak pernah disimpan tanpa persetujuan. Hapus semua data SiagaAI dari perangkat ini
              kapan saja.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('siaga.'))
                  .forEach((k) => localStorage.removeItem(k));
                sessionStorage.clear();
                toast.success('Data lokal dihapus');
                setTimeout(() => window.location.assign('/'), 600);
              }}
            >
              <Trash2 /> Hapus semua data lokal
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="min-w-0 flex-1 font-medium">{label}</span>
      <Badge variant={ok ? 'success' : 'neutral'} className="max-w-[55%] whitespace-normal text-right">
        {value}
      </Badge>
    </div>
  );
}
