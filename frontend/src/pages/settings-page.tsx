import { useQuery } from '@tanstack/react-query';
import {
  BellRing,
  Database,
  Download,
  Languages,
  Palette,
  FlaskConical,
  Server,
  Smartphone,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/layout-bits';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/overlays';
import { SCENARIOS } from '@/data/scenarios';
import { Chip } from '@/features/location/location-picker';
import { useInstallPrompt } from '@/features/pwa/install-prompt';
import { useDocumentTitle } from '@/hooks/use-misc';
import { isSupabaseEnabled } from '@/services/supabase/client';
import { useSettings } from '@/stores';
import { LanguageChooser, ThemeChooser } from '@/features/preferences/toggles';
import { t } from '@/lib/i18n';

export default function SettingsPage() {
  useDocumentTitle(t('Pengaturan', 'Settings'));
  const s = useSettings();
  const pwa = useInstallPrompt();
  const standalone =
    typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
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
    if (typeof Notification === 'undefined') return toast.error(t('Perangkat ini tidak mendukung notifikasi.', 'This device does not support notifications.'));
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      s.setNotifications(true);
      const reg = await navigator.serviceWorker?.getRegistration();
      const opts = {
        body: t(
          'Notifikasi aktif. Anda akan diberi tahu saat ada peringatan penting untuk lokasi Anda.',
          "Notifications on. You'll be notified when there are important alerts for your location.",
        ),
        icon: '/icons/icon-192.png',
      };
      if (reg) reg.showNotification('SiagaAI', opts);
      else new Notification('SiagaAI', opts);
    } else toast.error(t('Izin notifikasi ditolak di browser.', 'Notification permission was denied in the browser.'));
  };

  return (
    <div>
      <PageHeader
        title={t('Pengaturan', 'Settings')}
        mascot="kit"
        description={t(
          'Tampilan, bahasa, aksesibilitas, notifikasi, simulasi & status sistem.',
          'Appearance, language, accessibility, notifications, simulation & system status.',
        )}
      />
      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-4 text-brand" /> {t('Tema tampilan', 'Display theme')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemeChooser />
            <p className="mt-4 text-[12.5px] text-muted">
              {t(
                'Mode gelap nyaman untuk malam hari dan menghemat baterai di layar OLED.',
                'Dark mode is comfortable at night and saves battery on OLED screens.',
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="size-4 text-brand" /> {t('Bahasa', 'Language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageChooser />
            <p className="mt-4 text-[12.5px] text-muted">
              {t(
                'Berlaku untuk seluruh halaman, rekomendasi, dan jawaban AI. Teks resmi BMKG tetap ditampilkan apa adanya.',
                'Applies to every page, recommendation, and AI answer. Official BMKG text is shown as published.',
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="size-4 text-brand" /> {t('Ukuran teks', 'Text size')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                [1, t('Normal', 'Normal')],
                [1.125, t('Besar', 'Large')],
                [1.25, t('Sangat besar', 'Extra large')],
              ].map(([v, l]) => (
                <Chip key={l} active={s.textScale === v} onClick={() => s.setTextScale(v as number)}>
                  {l}
                </Chip>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] text-muted">
              {t('Untuk lansia & pengguna dengan gangguan penglihatan.', 'For older adults & users with visual impairments.')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4 text-brand" /> {t('Notifikasi peringatan', 'Alert notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center justify-between gap-4">
              <span className="text-[13.5px]">
                {t('Kabari saya saat ada peringatan penting di lokasi aktif', 'Notify me about important alerts at my active location')}
              </span>
              <Switch
                checked={s.notifications}
                onCheckedChange={toggleNotifications}
                aria-label={t('Notifikasi peringatan', 'Alert notifications')}
              />
            </label>
            <p className="mt-4 text-[12.5px] text-muted">
              {t('Notifikasi lokal PWA saat aplikasi terbuka atau di latar.', 'Local PWA notifications while the app is open or in the background.')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-ai" /> {t('Mode skenario (demonstrasi)', 'Scenario mode (demo)')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[13px] text-muted">
              {t('Uji kondisi risiko tinggi dari mana saja — selalu ditandai simulasi.', 'Test high-risk conditions from anywhere — always labelled as simulation.')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip active={!s.scenario} onClick={() => s.setScenario(null)}>
                {t('Data live', 'Live data')}
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
              <Smartphone className="size-4 text-brand" /> {t('Aplikasi (PWA)', 'App (PWA)')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              {standalone
                ? t('SiagaAI sudah terpasang di perangkat ini.', 'SiagaAI is already installed on this device.')
                : t(
                    'Pasang ke layar utama — rencana aksi & tas siaga tetap tersedia offline.',
                    'Add to your home screen — action plans & go-bag stay available offline.',
                  )}
            </p>
            {!standalone && (
              <Button
                size="sm"
                variant="secondary"
                disabled={!pwa.available}
                onClick={async () => {
                  if (await pwa.install()) toast.success(t('SiagaAI terpasang', 'SiagaAI installed'));
                }}
              >
                <Download /> {pwa.available ? t('Instal aplikasi', 'Install app') : t('Gunakan menu browser', 'Use the browser menu')}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4 text-brand" /> {t('Status integrasi', 'Integration status')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[13px]">
            <Row
              icon={<Sparkles className="size-4 text-ai" />}
              label="AI gateway (LLM)"
              value={
                health.data
                  ? health.data.ai.length
                    ? `${t('Aktif', 'Active')}: ${health.data.ai.join(', ')}`
                    : t('Local Reasoner (kunci LLM belum diatur)', 'Local Reasoner (LLM key not set)')
                  : health.isError
                    ? t('Local Reasoner (gateway tidak terjangkau)', 'Local Reasoner (gateway unreachable)')
                    : t('Memeriksa…', 'Checking…')
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
                    : t('Feed publik NRT', 'Public NRT feed')
                  : health.isError
                    ? 'Snapshot'
                    : t('Memeriksa…', 'Checking…')
              }
              ok={!!health.data}
            />
            <Row
              icon={<Database className="size-4" />}
              label={t('Supabase (akun & sinkronisasi)', 'Supabase (accounts & sync)')}
              value={isSupabaseEnabled ? t('Terhubung', 'Connected') : t('Mode perangkat (localStorage)', 'Device mode (localStorage)')}
              ok={isSupabaseEnabled}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="size-4 text-muted" /> {t('Privasi & data', 'Privacy & data')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-[13px] text-muted">
              {t(
                'GPS presisi tidak pernah disimpan tanpa persetujuan. Hapus semua data SiagaAI dari perangkat ini kapan saja.',
                'Precise GPS is never stored without consent. Delete all SiagaAI data from this device at any time.',
              )}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('siaga.'))
                  .forEach((k) => localStorage.removeItem(k));
                sessionStorage.clear();
                toast.success(t('Data lokal dihapus', 'Local data deleted'));
                setTimeout(() => window.location.assign('/'), 600);
              }}
            >
              <Trash2 /> {t('Hapus semua data lokal', 'Delete all local data')}
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
