import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  CloudRainWind,
  Sparkles,
  Sun,
  WifiOff,
  FlaskConical,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { SCENARIOS } from '@/data/scenarios';
import { useOnline } from '@/hooks/use-misc';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { weatherIconKey } from '@/lib/weather-codes';
import { FALLBACK_REASONS } from '@/services/ai/client';
import { useSettings } from '@/stores';
import { Button } from '../ui/button';
import { Tip } from '../ui/overlays';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-muted">
            {eyebrow}
          </div>
        )}
        <h1 className="text-balance text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const WX_ICONS = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  'heavy-rain': CloudRainWind,
  storm: CloudLightning,
};

export function WeatherIcon({ code, className }: { code: number | null | undefined; className?: string }) {
  const Icon = WX_ICONS[weatherIconKey(code)];
  return <Icon className={className} aria-hidden />;
}

/** Visual container for AI-generated content — always indigo + labelled with its provider. */
export function AiPanel({
  title,
  children,
  provider,
  fallbackReason,
  generatedAt,
  actions,
  className,
  compact,
}: {
  title: string;
  children: ReactNode;
  provider?: string;
  fallbackReason?: string;
  generatedAt?: string;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-card border border-indigo-100 bg-gradient-to-b from-ai-soft/80 to-white',
        compact ? 'p-4' : 'p-5',
        className,
      )}
    >
      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-ai/5 blur-2xl" aria-hidden />
      <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <span className="grid size-7 place-items-center rounded-lg bg-ai text-white">
            <Sparkles className="size-4" aria-hidden />
          </span>
          {title}
        </h3>
        {actions}
      </div>
      <div className="relative">{children}</div>
      {provider && (
        <div className="relative mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <Tip
            content={
              fallbackReason
                ? `Mode cadangan: ${FALLBACK_REASONS[fallbackReason] ?? fallbackReason}. Jawaban disusun aturan deterministik dari data yang sama.`
                : 'Dihasilkan LLM melalui gateway server yang aman, berlandaskan konteks data terstruktur.'
            }
          >
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-semibold text-ai ring-1 ring-indigo-100"
            >
              <Sparkles className="size-3" aria-hidden /> {provider}
            </span>
          </Tip>
          {generatedAt && <span>· {formatTime(generatedAt)}</span>}
          <span>· AI menjelaskan, algoritma menghitung. Bukan peringatan resmi.</span>
        </div>
      )}
    </section>
  );
}

export function AiThinking({ steps }: { steps?: string[] }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-ai">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bounce rounded-full bg-ai"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
        SiagaAI sedang menyusun…
      </div>
      {steps ? (
        <ul className="space-y-1.5 text-[13px] text-muted">
          {steps.map((s) => (
            <li key={s}>· {s}</li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          <div className="skeleton h-3 w-11/12 rounded" />
          <div className="skeleton h-3 w-9/12 rounded" />
          <div className="skeleton h-3 w-10/12 rounded" />
        </div>
      )}
    </div>
  );
}

/** Minimal safe markdown: **bold**, "- " bullets, line breaks. No HTML injection. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length)
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-1.5 space-y-1 pl-1">
          {list.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ai/60" aria-hidden />
              <span>{inline(l)}</span>
            </li>
          ))}
        </ul>,
      );
    list = [];
  };
  for (const l of lines) {
    const m = l.match(/^\s*[-•*]\s+(.*)/);
    if (m) list.push(m[1]);
    else {
      flush();
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-1">
          {inline(l)}
        </p>,
      );
    }
  }
  flush();
  return <div className={cn('text-[14px] leading-relaxed text-neutral-700', className)}>{blocks}</div>;
}

export function Disclaimer({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <p className={cn('flex items-start gap-2 text-[12px] leading-relaxed text-muted', className)}>
      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        SiagaAI adalah platform pendukung keputusan dan{' '}
        <b className="font-semibold text-neutral-700">tidak menggantikan peringatan atau instruksi resmi</b>{' '}
        dari BMKG, BNPB, BPBD, dan aparat berwenang.
        {!compact && ' Dalam keadaan darurat, ikuti arahan petugas dan hubungi 112.'}
      </span>
    </p>
  );
}

export function ScenarioBanner() {
  const scenario = useSettings((s) => s.scenario);
  const setScenario = useSettings((s) => s.setScenario);
  if (!scenario) return null;
  const s = SCENARIOS[scenario];
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center gap-3 border-b border-indigo-200 bg-[repeating-linear-gradient(135deg,#EEF2FF,#EEF2FF_12px,#E0E7FF_12px,#E0E7FF_24px)] px-4 py-2 text-[13px] text-indigo-950"
    >
      <FlaskConical className="size-4 shrink-0 text-ai" aria-hidden />
      <p className="min-w-0 flex-1 truncate">
        <b>MODE SKENARIO</b> · {s.emoji} {s.title} —{' '}
        <span className="hidden sm:inline">data simulasi untuk demonstrasi, bukan kondisi aktual.</span>
        <span className="sm:hidden">data simulasi.</span>
      </p>
      <Button size="sm" variant="secondary" className="h-8 shrink-0" onClick={() => setScenario(null)}>
        <X /> Keluar
      </Button>
    </div>
  );
}

export function OfflineBanner({ lastUpdate }: { lastUpdate?: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-neutral-800 bg-ink px-4 py-2 text-[13px] text-white"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>
        <b>Mode Offline</b> — menampilkan data tersimpan
        {lastUpdate ? `, terakhir diperbarui ${formatTime(lastUpdate)}` : ''}. Rencana aksi & daftar darurat
        tetap tersedia.
      </span>
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[15px] font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-[13px] font-semibold text-brand hover:text-brand-dark hover:underline">
      {children}
    </Link>
  );
}
