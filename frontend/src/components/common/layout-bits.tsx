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
import { Ara, type AraPose } from './ara';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  mascot,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Optional Ara pose shown beside the title on larger screens. */
  mascot?: AraPose;
}) {
  return (
    <header
      className={cn(
        'mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-end gap-4">
        {mascot && <Ara pose={mascot} size={84} className="-mb-1 hidden sm:block" />}
        <div className="min-w-0">
          {eyebrow && (
            <div className="telemetry mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 normal-case [&>*]:normal-case">
              {eyebrow}
            </div>
          )}
          <h1 className="text-balance text-[27px] font-bold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[34px]">
            {title}
          </h1>
          {description && (
            <p className="text-pretty mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">
              {description}
            </p>
          )}
        </div>
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

/** Visual container for AI-generated content — white surface, one thin indigo accent, always labelled. */
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
        'relative overflow-hidden rounded-card border border-line bg-white shadow-soft',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0 w-[3px] bg-ai" aria-hidden />
      <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <Sparkles className="size-4 text-ai" aria-hidden />
          {title}
        </h3>
        {actions}
      </div>
      <div className="relative">{children}</div>
      {provider && (
        <div className="relative mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 font-mono text-[10.5px] uppercase tracking-[0.04em] text-subtle">
          <Tip
            content={
              fallbackReason
                ? `Mode cadangan: ${FALLBACK_REASONS[fallbackReason] ?? fallbackReason}. Jawaban disusun aturan deterministik dari data yang sama.`
                : 'Dihasilkan LLM melalui gateway server yang aman, berlandaskan konteks data terstruktur.'
            }
          >
            <span tabIndex={0} className="inline-flex items-center gap-1 font-semibold text-ai">
              ✦ {provider}
            </span>
          </Tip>
          {generatedAt && <span>· {formatTime(generatedAt)}</span>}
          <span className="normal-case tracking-normal">· AI menjelaskan, algoritma menghitung.</span>
        </div>
      )}
    </section>
  );
}

const DEFAULT_STEPS = [
  'Memeriksa sinyal lingkungan',
  'Menilai kedekatan bahaya',
  'Memperkirakan paparan personal',
  'Menyiapkan rekomendasi',
];

/** Structured, honest loading steps — no fake neural animations. */
export function AiThinking({ steps = DEFAULT_STEPS }: { steps?: string[] }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ai">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bounce rounded-full bg-ai"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
        Menganalisis wilayah Anda…
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li
            key={s}
            className="flex animate-fade-up items-center gap-3 text-[13px] text-muted"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            <span className="font-mono text-[11px] font-semibold text-ai/70">
              {String(i + 1).padStart(2, '0')}
            </span>
            {s}
          </li>
        ))}
      </ol>
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
              <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-neutral-400" aria-hidden />
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
  return <div className={cn('text-[14.5px] leading-[1.7] text-neutral-700', className)}>{blocks}</div>;
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
      className="sticky top-0 z-40 flex items-center gap-3 border-b border-ai/15 bg-[repeating-linear-gradient(135deg,#EEF0FF,#EEF0FF_12px,#E6E9FF_12px,#E6E9FF_24px)] px-4 py-2 text-[13px] text-ai-deep"
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
  eyebrow,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="data-label mb-1">{eyebrow}</p>}
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{children}</h2>
      </div>
      {action}
    </div>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-brand hover:decoration-brand"
    >
      {children}
    </Link>
  );
}
