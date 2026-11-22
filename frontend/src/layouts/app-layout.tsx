import {
  Bell,
  BookOpenText,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Gauge,
  Home,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Logo, LogoMark, NusantaraBackdrop } from '@/components/common/brand';
import { Disclaimer, OfflineBanner, ScenarioBanner } from '@/components/common/layout-bits';
import { LoadingState } from '@/components/common/data-state';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/overlays';
import { AssistantLauncher } from '@/features/ai/assistant';
import { useAlerts } from '@/features/alerts/use-alerts';
import { LocationPicker } from '@/features/location/location-picker';
import { RiskRecorder } from '@/features/risk/risk-recorder';
import { SyncManager } from '@/features/auth/sync-manager';
import { useActiveLocation } from '@/hooks/use-siaga-data';
import { useMediaQuery } from '@/hooks/use-misc';
import { useAuthStore, useSettings } from '@/stores';
import { cn } from '@/lib/utils';

const PRIMARY = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/map', label: 'Siaga Map', icon: MapIcon },
  { to: '/app/risk', label: 'Risiko Saya', icon: Gauge },
  { to: '/app/action-plan', label: 'Rencana Aksi', icon: ClipboardCheck },
  { to: '/app/family', label: 'Keluarga', icon: Users },
  { to: '/app/community', label: 'Komunitas', icon: Megaphone },
];

const SECONDARY = [
  { to: '/app/profile', label: 'Profil', icon: UserRound },
  { to: '/app/settings', label: 'Pengaturan', icon: Settings },
  { to: '/app/about', label: 'Data & Metodologi', icon: BookOpenText },
];

const MOBILE = [
  { to: '/app', label: 'Beranda', icon: Home, end: true },
  { to: '/app/map', label: 'Peta', icon: MapIcon },
  { to: '/app/risk', label: 'Risiko', icon: Gauge },
  { to: '/app/action-plan', label: 'Aksi', icon: ClipboardCheck },
  { to: '/app/profile', label: 'Profil', icon: UserRound },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  collapsed: boolean;
}) {
  const link = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors',
          isActive ? 'bg-brand-soft text-brand-dark' : 'text-neutral-600 hover:bg-neutral-100 hover:text-ink',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand"
              aria-hidden
            />
          )}
          <Icon className="size-[18px] shrink-0" aria-hidden />
          <span className={cn(collapsed && 'sr-only')}>{label}</span>
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tip content={label} side="right">
      {link}
    </Tip>
  ) : (
    link
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-white transition-[width] duration-300 md:flex',
        collapsed ? 'w-[76px]' : 'w-[260px]',
      )}
      aria-label="Navigasi utama"
    >
      <div className="relative overflow-hidden">
        <NusantaraBackdrop topo={false} />
        <Link
          to="/"
          className={cn('relative flex h-16 items-center px-5', collapsed && 'justify-center px-0')}
          aria-label="SiagaAI beranda"
        >
          {collapsed ? <LogoMark /> : <Logo />}
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {PRIMARY.map((i) => (
          <NavItem key={i.to} {...i} collapsed={collapsed} />
        ))}
        <div className="my-3 h-px bg-line" />
        {SECONDARY.map((i) => (
          <NavItem key={i.to} {...i} collapsed={collapsed} />
        ))}
      </nav>
      {!collapsed && (
        <div className="m-3 rounded-2xl border border-line bg-neutral-50 p-3.5">
          <Disclaimer compact />
        </div>
      )}
      <button
        onClick={onToggle}
        className="flex h-11 items-center justify-center gap-2 border-t border-line text-[13px] font-medium text-muted hover:bg-neutral-50 hover:text-ink"
        aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && 'Ciutkan'}
      </button>
    </aside>
  );
}

function Topbar() {
  const location = useActiveLocation();
  const scenario = useSettings((s) => s.scenario);
  const [picker, setPicker] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { counts } = useAlerts();
  const urgent = counts.critical + counts.warning;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="md:hidden" aria-label="SiagaAI beranda">
          <LogoMark className="size-8" />
        </Link>
        <button
          onClick={() => setPicker(true)}
          className="group flex min-w-0 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-left shadow-soft transition-colors hover:border-neutral-300"
          aria-label={`Lokasi aktif: ${location.name}. Ubah lokasi`}
        >
          <MapPin className={cn('size-4 shrink-0', scenario ? 'text-ai' : 'text-brand')} aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight">{location.name}</span>
            <span className="block truncate text-[11px] leading-tight text-muted">
              {scenario
                ? 'Mode skenario'
                : location.source === 'gps'
                  ? 'GPS · tidak disimpan'
                  : location.region || 'Indonesia'}
            </span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted transition-transform group-hover:translate-y-0.5"
            aria-hidden
          />
        </button>
        <div className="flex-1" />
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Pusat peringatan, ${urgent} peringatan penting`}
        >
          <Link to="/app/alerts">
            <Bell className="!size-5" />
            {urgent > 0 && (
              <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">
                {urgent > 9 ? '9+' : urgent}
              </span>
            )}
          </Link>
        </Button>
        {user ? (
          <Link
            to="/app/profile"
            className="hidden items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-neutral-100 sm:flex"
            aria-label="Profil"
          >
            <span className="grid size-8 place-items-center rounded-full bg-ink text-[13px] font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-[13px] font-semibold lg:block">{user.name}</span>
          </Link>
        ) : (
          <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Masuk</Link>
          </Button>
        )}
      </div>
      <LocationPicker open={picker} onOpenChange={setPicker} />
    </header>
  );
}

function BottomNav() {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-md md:hidden"
      aria-label="Navigasi"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {MOBILE.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-brand' : 'text-neutral-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-7 w-12 place-items-center rounded-full transition-colors',
                      isActive && 'bg-brand-soft',
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1199px)');
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const textScale = useSettings((s) => s.textScale);
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(textScale));
  }, [textScale]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const isMap = pathname.startsWith('/app/map');

  return (
    <div className="flex min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
      >
        Lewati ke konten utama
      </a>
      <Sidebar collapsed={collapsed ?? isTablet} onToggle={() => setCollapsed(!(collapsed ?? isTablet))} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <ScenarioBanner />
        <OfflineBanner />
        <Topbar />
        <main
          id="main"
          className={cn(
            'mx-auto w-full flex-1',
            isMap ? 'max-w-none' : 'max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:pt-8',
          )}
        >
          <Suspense fallback={<LoadingState label="Memuat halaman…" className="justify-center py-24" />}>
            {children ?? <Outlet />}
          </Suspense>
        </main>
      </div>
      <BottomNav />
      <AssistantLauncher />
      <RiskRecorder />
      <SyncManager />
    </div>
  );
}
