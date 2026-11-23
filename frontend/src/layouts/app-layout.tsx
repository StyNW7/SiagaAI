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
import { Link, NavLink, Outlet, useLocation, useMatch, useResolvedPath } from 'react-router';
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
import { t } from '@/lib/i18n';
import { PreferenceToggles } from '@/features/preferences/toggles';
import { useAssistantStore, useAuthStore, useSettings } from '@/stores';

const navGroups = () => [
  {
    label: t('Ringkasan', 'Overview'),
    items: [
      { to: '/app', label: 'Dashboard', icon: Home, end: true },
      { to: '/app/map', label: 'Siaga Map', icon: MapIcon },
      { to: '/app/risk', label: t('Risiko Saya', 'My Risk'), icon: Gauge },
      { to: '/app/alerts', label: t('Peringatan', 'Alerts'), icon: Bell },
    ],
  },
  {
    label: t('Kesiapsiagaan', 'Preparedness'),
    items: [
      { to: '/app/action-plan', label: t('Rencana Aksi', 'Action Plan'), icon: ClipboardCheck },
      { to: '/app/family', label: t('Keluarga', 'Family'), icon: Users },
    ],
  },
  {
    label: t('Komunitas', 'Community'),
    items: [{ to: '/app/community', label: t('Laporan Warga', 'Community Reports'), icon: Megaphone }],
  },
];

const secondaryNav = () => [
  { to: '/app/profile', label: t('Profil', 'Profile'), icon: UserRound },
  { to: '/app/settings', label: t('Pengaturan', 'Settings'), icon: Settings },
  { to: '/app/about', label: t('Data & Metodologi', 'Data & Methodology'), icon: BookOpenText },
];

const mobileNav = () => [
  { to: '/app', label: t('Beranda', 'Home'), icon: Home, end: true },
  { to: '/app/map', label: t('Peta', 'Map'), icon: MapIcon },
  { to: '/app/risk', label: t('Risiko', 'Risk'), icon: Gauge },
  { to: '/app/action-plan', label: t('Aksi', 'Action'), icon: ClipboardCheck },
  { to: '/app/profile', label: t('Profil', 'Profile'), icon: UserRound },
];

const pageNames = (): Record<string, string> => ({
  '/app': 'Dashboard',
  '/app/map': 'Siaga Map',
  '/app/risk': t('Risiko Saya', 'My Risk'),
  '/app/action-plan': t('Rencana Aksi', 'Action Plan'),
  '/app/family': t('Keluarga', 'Family'),
  '/app/community': t('Laporan Warga', 'Community Reports'),
  '/app/alerts': t('Peringatan', 'Alerts'),
  '/app/profile': t('Profil', 'Profile'),
  '/app/settings': t('Pengaturan', 'Settings'),
  '/app/about': t('Data & Metodologi', 'Data & Methodology'),
});

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
  // Resolve "active" here rather than with NavLink's render-prop className: the tooltip trigger's
  // Slot stringifies function classNames, which made every collapsed item look active.
  const resolved = useResolvedPath(to);
  const isActive = !!useMatch({ path: resolved.pathname, end: !!end });
  const link = (
    <NavLink
      to={to}
      end={end}
      className={cn(
        'group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors duration-150',
        isActive
          ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-line'
          : 'text-neutral-600 hover:bg-surface/60 hover:text-ink',
        collapsed && 'justify-center px-0',
      )}
    >
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
  const { unreadUrgent: urgent } = useAlerts();
  const openAssistant = useAssistantStore((s) => s.setOpen);
  return (
    <aside
      className={cn(
        'sticky top-[var(--safe-top)] hidden h-safe-screen shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-300 ease-out md:flex',
        collapsed ? 'w-[76px]' : 'w-[252px]',
      )}
      aria-label={t('Navigasi utama', 'Main navigation')}
    >
      <div className="relative overflow-hidden">
        <NusantaraBackdrop topo={false} />
        <Link
          to="/"
          className={cn('relative flex h-[72px] items-center px-5', collapsed && 'justify-center px-0')}
          aria-label={t('SiagaAI beranda', 'SiagaAI home')}
        >
          {collapsed ? <LogoMark className="size-9" /> : <Logo />}
        </Link>
      </div>
      <nav className="scrollbar-thin flex flex-1 flex-col overflow-y-auto px-3 pb-3 pt-2">
        {navGroups().map((g) => (
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
          {secondaryNav().map((i) => (
            <NavItem key={i.to} {...i} collapsed={collapsed} />
          ))}
        </div>
      </nav>
      {!collapsed && (
        <button
          onClick={() => openAssistant(true)}
          className="group relative mx-3 mb-3 flex items-end gap-1 overflow-hidden rounded-[14px] border border-line bg-surface pl-1 pr-3 pt-2 text-left transition-shadow hover:shadow-lift [@media(max-height:780px)]:hidden"
        >
          <Ara pose="explain" size={64} className="-mb-1" />
          <span className="min-w-0 pb-3">
            <span className="block text-[13px] font-bold leading-tight text-ink">
              {t('Tanya Ara', 'Ask Ara')}
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
              {t('Asisten siaga berbasis AI', 'AI-powered preparedness assistant')}
            </span>
          </span>
          <Sparkles className="absolute right-3 top-3 size-3.5 text-ai transition-transform group-hover:rotate-12" />
        </button>
      )}
      <button
        onClick={onToggle}
        className="flex h-11 items-center justify-center gap-2 border-t border-line font-mono text-[11px] uppercase tracking-[0.08em] text-subtle transition-colors hover:bg-surface/60 hover:text-ink"
        aria-label={
          collapsed ? t('Perluas sidebar', 'Expand sidebar') : t('Ciutkan sidebar', 'Collapse sidebar')
        }
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && t('Ciutkan', 'Collapse')}
      </button>
    </aside>
  );
}

function LiveClock() {
  const now = useNow(30_000);
  const online = useOnline();
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted lg:inline-flex">
      <span className="relative flex size-1.5" aria-hidden>
        {online && <span className="absolute inset-0 animate-ping rounded-full bg-risk-safe/60" />}
        <span className={cn('relative size-1.5 rounded-full', online ? 'bg-risk-safe' : 'bg-neutral-400')} />
      </span>
      {online ? t('Data live', 'Live data') : 'Offline'}
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
  const { unreadUrgent: urgent } = useAlerts();
  const { pathname } = useLocation();
  const page = pageNames()[pathname.replace(/\/$/, '')] ?? 'SiagaAI';
  return (
    <header className="sticky top-[var(--safe-top)] z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="md:hidden" aria-label={t('SiagaAI beranda', 'SiagaAI home')}>
          <LogoMark className="size-8" />
        </Link>
        <p className="hidden shrink-0 items-center gap-2.5 text-[13px] lg:flex">
          <span className="font-semibold text-ink">{page}</span>
          <span className="text-line-strong">/</span>
        </p>
        <button
          onClick={() => setPicker(true)}
          className="group flex min-w-0 items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 text-left transition-colors hover:border-line-strong"
          aria-label={t(
            `Lokasi aktif: ${location.name}. Ubah lokasi`,
            `Active location: ${location.name}. Change location`,
          )}
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
                ? t('Mode skenario', 'Scenario mode')
                : location.source === 'gps'
                  ? t('GPS · tidak disimpan', 'GPS · not saved')
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
        <PreferenceToggles className="gap-1.5 sm:gap-2" />
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={t(
            `Pusat peringatan, ${urgent} peringatan penting belum dibaca`,
            `Alert center, ${urgent} unread important alerts`,
          )}
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
            className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-surface sm:flex"
            aria-label={t('Profil', 'Profile')}
          >
            <span className="grid size-8 place-items-center rounded-full bg-inverse text-[13px] font-bold text-on-inverse">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-32 truncate text-[13px] font-semibold lg:block">{user.name}</span>
          </Link>
        ) : (
          <Button asChild variant="secondary" size="sm" className="hidden rounded-full sm:inline-flex">
            <Link to="/auth">{t('Masuk', 'Sign in')}</Link>
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
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl md:hidden"
      aria-label={t('Navigasi', 'Navigation')}
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 px-1">
        {mobileNav().map(({ to, label, icon: Icon, end }) => (
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
  // Mirrors the sidebar "Tanya Ara" card, which is shown only on md+ screens taller than 780px.
  const sidebarAraVisible = useMediaQuery('(min-width: 768px) and (min-height: 781px)');
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const sidebarCollapsed = collapsed ?? isTablet;
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
    <div className="flex min-h-safe-screen bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-inverse focus:px-3 focus:py-2 focus:text-on-inverse"
      >
        {t('Lewati ke konten utama', 'Skip to main content')}
      </a>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setCollapsed(!sidebarCollapsed)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <ScenarioBanner />
        <OfflineBanner />
        <Topbar />
        <main
          id="main"
          className={cn(
            'mx-auto w-full flex-1',
            isMap
              ? 'max-w-none'
              : 'max-w-[1600px] px-4 pb-[calc(8rem+var(--safe-bottom))] pt-6 sm:px-6 md:pb-[calc(6rem+var(--safe-bottom))] lg:px-10 lg:pt-9',
          )}
        >
          <Suspense fallback={<PageLoader label={t('Memuat halaman…', 'Loading page…')} />}>
            <div key={pathname} className={cn(!isMap && 'animate-fade-up')}>
              {children ?? <Outlet />}
            </div>
          </Suspense>
        </main>
      </div>
      <BottomNav />
      {/* The expanded sidebar already has a "Tanya Ara" card — no need for a second floating button. */}
      <AssistantLauncher hideTrigger={sidebarAraVisible && !sidebarCollapsed} />
      <RiskRecorder />
      <SyncManager />
      <Onboarding />
      <InstallPrompt />
    </div>
  );
}
