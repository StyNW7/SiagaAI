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
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Ara } from '@/components/common/ara';
import { Logo, LogoMark, NusantaraBackdrop } from '@/components/common/brand';
import { PageLoader } from '@/components/common/data-state';
import { OfflineBanner, ScenarioBanner } from '@/components/common/layout-bits';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/overlays';
import { AssistantLauncher } from '@/features/ai/assistant';
import { useAlerts } from '@/features/alerts/use-alerts';
import { SyncManager } from '@/features/auth/sync-manager';
import { LocationPicker } from '@/features/location/location-picker';
import { Onboarding } from '@/features/onboarding/onboarding';
import { InstallPrompt } from '@/features/pwa/install-prompt';
import { RiskRecorder } from '@/features/risk/risk-recorder';
import { useMediaQuery, useNow, useOnline } from '@/hooks/use-misc';
import { useActiveLocation } from '@/hooks/use-siaga-data';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAssistantStore, useAuthStore, useSettings } from '@/stores';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/app', label: 'Dashboard', icon: Home, end: true },
      { to: '/app/map', label: 'Siaga Map', icon: MapIcon },
      { to: '/app/risk', label: 'Risiko Saya', icon: Gauge },
      { to: '/app/alerts', label: 'Peringatan', icon: Bell },
    ],
  },
  {
    label: 'Kesiapsiagaan',
    items: [
      { to: '/app/action-plan', label: 'Rencana Aksi', icon: ClipboardCheck },
      { to: '/app/family', label: 'Keluarga', icon: Users },
    ],
  },
  {
    label: 'Komunitas',
    items: [{ to: '/app/community', label: 'Laporan Warga', icon: Megaphone }],
  },
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

const PAGE_NAMES: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/map': 'Siaga Map',
  '/app/risk': 'Risiko Saya',
  '/app/action-plan': 'Rencana Aksi',
  '/app/family': 'Keluarga',
  '/app/community': 'Laporan Warga',
  '/app/alerts': 'Peringatan',
  '/app/profile': 'Profil',
  '/app/settings': 'Pengaturan',
  '/app/about': 'Data & Metodologi',
};

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
  badge,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  const link = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors duration-150',
          isActive
            ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-line'
            : 'text-neutral-600 hover:bg-white/60 hover:text-ink',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
              aria-hidden
            />
          )}
          <Icon
            className={cn(
              'size-[18px] shrink-0 transition-colors',
              isActive ? 'text-brand' : 'text-neutral-500 group-hover:text-ink',
            )}
            strokeWidth={isActive ? 2.2 : 1.9}
            aria-hidden
          />
          <span className={cn('flex-1 truncate', collapsed && 'sr-only')}>{label}</span>
          {!!badge && !collapsed && (
            <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 font-mono text-[10px] font-semibold leading-5 text-white">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
          {!!badge && collapsed && (
            <span className="absolute right-2.5 top-2 size-2 rounded-full bg-brand ring-2 ring-sidebar" />
          )}
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
  const { counts } = useAlerts();
  const urgent = counts.critical + counts.warning;
  const openAssistant = useAssistantStore((s) => s.setOpen);
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-300 ease-out md:flex',
        collapsed ? 'w-[76px]' : 'w-[252px]',
      )}
      aria-label="Navigasi utama"
    >
      <div className="relative overflow-hidden">
        <NusantaraBackdrop topo={false} />
        <Link
          to="/"
          className={cn('relative flex h-[72px] items-center px-5', collapsed && 'justify-center px-0')}
          aria-label="SiagaAI beranda"
        >
          {collapsed ? <LogoMark className="size-9" /> : <Logo />}
        </Link>
      </div>
      <nav className="scrollbar-thin flex flex-1 flex-col overflow-y-auto px-3 pb-3 pt-2">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="mb-4">
            {!collapsed ? (
              <p className="mb-1.5 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
                {g.label}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-line-strong" />
            )}
            <div className="flex flex-col gap-0.5">
              {g.items.map((i) => (
                <NavItem
                  key={i.to}
                  {...i}
                  collapsed={collapsed}
                  badge={i.to === '/app/alerts' ? urgent : undefined}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
          {SECONDARY.map((i) => (
            <NavItem key={i.to} {...i} collapsed={collapsed} />
          ))}
        </div>
      </nav>
      {!collapsed && (
        <button
          onClick={() => openAssistant(true)}
          className="group relative mx-3 mb-3 flex items-end gap-1 overflow-hidden rounded-[14px] border border-line bg-white pl-1 pr-3 pt-2 text-left transition-shadow hover:shadow-lift [@media(max-height:780px)]:hidden"
        >
          <Ara pose="explain" size={64} className="-mb-1" />
          <span className="min-w-0 pb-3">
            <span className="block text-[13px] font-bold leading-tight text-ink">Tanya Ara</span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
              Asisten siaga berbasis AI
            </span>
          </span>
          <Sparkles className="absolute right-3 top-3 size-3.5 text-ai transition-transform group-hover:rotate-12" />
        </button>
      )}
      <button
        onClick={onToggle}
        className="flex h-11 items-center justify-center gap-2 border-t border-line font-mono text-[11px] uppercase tracking-[0.08em] text-subtle transition-colors hover:bg-white/60 hover:text-ink"
        aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && 'Ciutkan'}
      </button>
    </aside>
  );
}

function LiveClock() {
  const now = useNow(30_000);
  const online = useOnline();
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted lg:inline-flex">
      <span className="relative flex size-1.5" aria-hidden>
        {online && <span className="absolute inset-0 animate-ping rounded-full bg-risk-safe/60" />}
        <span className={cn('relative size-1.5 rounded-full', online ? 'bg-risk-safe' : 'bg-neutral-400')} />
      </span>
      {online ? 'Live data' : 'Offline'}
      <span className="text-line-strong">|</span>
      {formatTime(now)}
    </span>
  );
}

function Topbar() {
  const location = useActiveLocation();
  const scenario = useSettings((s) => s.scenario);
  const [picker, setPicker] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { counts } = useAlerts();
  const { pathname } = useLocation();
  const urgent = counts.critical + counts.warning;
  const page = PAGE_NAMES[pathname.replace(/\/$/, '')] ?? 'SiagaAI';
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="md:hidden" aria-label="SiagaAI beranda">
          <LogoMark className="size-8" />
        </Link>
        <p className="hidden shrink-0 items-center gap-2.5 text-[13px] lg:flex">
          <span className="font-semibold text-ink">{page}</span>
          <span className="text-line-strong">/</span>
        </p>
        <button
          onClick={() => setPicker(true)}
          className="group flex min-w-0 items-center gap-2.5 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-3 text-left transition-colors hover:border-line-strong"
          aria-label={`Lokasi aktif: ${location.name}. Ubah lokasi`}
        >
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-full',
              scenario ? 'bg-ai-soft text-ai' : 'bg-brand-soft text-brand',
            )}
          >
            <MapPin className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight">{location.name}</span>
            <span className="block truncate font-mono text-[10px] uppercase leading-tight tracking-[0.04em] text-subtle">
              {scenario
                ? 'Mode skenario'
                : location.source === 'gps'
                  ? 'GPS · tidak disimpan'
                  : location.region || 'Indonesia'}
            </span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-y-0.5"
            aria-hidden
          />
        </button>
        <div className="flex-1" />
        <LiveClock />
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={`Pusat peringatan, ${urgent} peringatan penting`}
        >
          <Link to="/app/alerts">
            <Bell className="!size-[19px]" />
            {urgent > 0 && (
              <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-brand px-1 font-mono text-[9.5px] font-semibold leading-4 text-white ring-2 ring-canvas">
                {urgent > 9 ? '9+' : urgent}
              </span>
            )}
          </Link>
        </Button>
        {user ? (
          <Link
            to="/app/profile"
            className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-white sm:flex"
            aria-label="Profil"
          >
            <span className="grid size-8 place-items-center rounded-full bg-ink text-[13px] font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-32 truncate text-[13px] font-semibold lg:block">{user.name}</span>
          </Link>
        ) : (
          <Button asChild variant="secondary" size="sm" className="hidden rounded-full sm:inline-flex">
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
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/90 backdrop-blur-xl md:hidden"
      aria-label="Navigasi"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 px-1">
        {MOBILE.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors',
                  isActive ? 'text-ink' : 'text-neutral-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-7 w-12 place-items-center rounded-full transition-all duration-200',
                      isActive ? 'bg-brand-soft text-brand' : 'bg-transparent',
                    )}
                  >
                    <Icon className="size-[19px]" strokeWidth={isActive ? 2.2 : 1.9} aria-hidden />
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
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
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
            isMap ? 'max-w-none' : 'max-w-[1600px] px-4 pb-32 pt-6 sm:px-6 md:pb-16 lg:px-10 lg:pt-9',
          )}
        >
          <Suspense fallback={<PageLoader label="Memuat halaman…" />}>
            <div key={pathname} className={cn(!isMap && 'animate-fade-up')}>
              {children ?? <Outlet />}
            </div>
          </Suspense>
        </main>
      </div>
      <BottomNav />
      <AssistantLauncher />
      <RiskRecorder />
      <SyncManager />
      <Onboarding />
      <InstallPrompt />
    </div>
  );
}
