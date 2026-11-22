import { Laptop, Moon, Sun } from 'lucide-react';
import { Tip } from '@/components/ui/overlays';
import { LANGS, t, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSettings, type ThemePref } from '@/stores';
import { useResolvedTheme } from './theme';

/** One-tap light/dark switch with an animated sun ↔ moon. */
export function ThemeToggle({ className, tone = 'default' }: { className?: string; tone?: 'default' | 'onDark' }) {
  const theme = useResolvedTheme();
  const setTheme = useSettings((s) => s.setTheme);
  const dark = theme === 'dark';
  const label = dark ? t('Ganti ke mode terang', 'Switch to light mode') : t('Ganti ke mode gelap', 'Switch to dark mode');
  return (
    <Tip content={label}>
      <button
        type="button"
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        aria-label={label}
        aria-pressed={dark}
        className={cn(
          'relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border transition-colors',
          tone === 'onDark'
            ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
            : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-raised',
          className,
        )}
      >
        <Sun
          className={cn(
            'absolute size-[17px] transition-all duration-500 ease-out',
            dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 text-[#E8A317] opacity-100',
          )}
          aria-hidden
        />
        <Moon
          className={cn(
            'absolute size-[16px] transition-all duration-500 ease-out',
            dark ? 'rotate-0 scale-100 text-ai-deep opacity-100' : '-rotate-90 scale-0 opacity-0',
          )}
          aria-hidden
        />
      </button>
    </Tip>
  );
}

/** Segmented ID | EN switch. */
export function LanguageToggle({ className, tone = 'default' }: { className?: string; tone?: 'default' | 'onDark' }) {
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  return (
    <div
      role="radiogroup"
      aria-label={t('Bahasa', 'Language')}
      className={cn(
        'relative inline-grid h-9 shrink-0 grid-cols-2 items-center rounded-full border p-[3px] font-mono text-[11px] font-semibold tracking-[0.06em]',
        tone === 'onDark' ? 'border-white/20 bg-white/10' : 'border-line bg-surface',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.15)] transition-transform duration-300 ease-out',
          tone === 'onDark' ? 'bg-white' : 'bg-inverse',
          lang === 'en' && 'translate-x-full',
        )}
      />
      {LANGS.map((l) => {
        const active = l.value === lang;
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={l.label}
            title={l.label}
            onClick={() => !active && setLang(l.value as Lang)}
            className={cn(
              'relative z-10 h-full min-w-8 rounded-full px-2 transition-colors duration-300',
              active
                ? tone === 'onDark'
                  ? 'text-[#171717]'
                  : 'text-on-inverse'
                : tone === 'onDark'
                  ? 'text-white/70 hover:text-white'
                  : 'text-muted hover:text-ink',
            )}
          >
            {l.short}
          </button>
        );
      })}
    </div>
  );
}

/** Both switches side by side. */
export function PreferenceToggles({ className, tone }: { className?: string; tone?: 'default' | 'onDark' }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LanguageToggle tone={tone} />
      <ThemeToggle tone={tone} />
    </div>
  );
}

/** Full theme chooser (Light / Dark / System) for the settings page. */
export function ThemeChooser() {
  const pref = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const options: { value: ThemePref; label: string; hint: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('Terang', 'Light'), hint: t('Hangat & bersih', 'Warm & clean'), icon: Sun },
    { value: 'dark', label: t('Gelap', 'Dark'), hint: t('Nyaman di malam hari', 'Easy on the eyes at night'), icon: Moon },
    { value: 'system', label: t('Sistem', 'System'), hint: t('Ikuti perangkat', 'Follow your device'), icon: Laptop },
  ];
  return (
    <div role="radiogroup" aria-label={t('Tema tampilan', 'Display theme')} className="grid grid-cols-3 gap-2.5">
      {options.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={cn(
              'group flex flex-col overflow-hidden rounded-xl border text-left transition-all',
              active ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-line-strong',
            )}
          >
            <ThemePreview kind={o.value} />
            <span className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2.5">
              <o.icon className={cn('size-4 shrink-0', active ? 'text-brand' : 'text-muted')} aria-hidden />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight text-ink">{o.label}</span>
                <span className="block text-[11px] leading-snug text-muted">{o.hint}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ThemePreview({ kind }: { kind: ThemePref }) {
  const pane = (dark: boolean) => (
    <span className={cn('flex h-full flex-1 flex-col gap-1.5 p-2.5', dark ? 'bg-[#0E0E0D]' : 'bg-[#F6F6F3]')}>
      <span className={cn('h-1.5 w-8 rounded-full', dark ? 'bg-[#3B3A36]' : 'bg-[#D4D2CC]')} />
      <span
        className={cn(
          'flex flex-1 flex-col gap-1 rounded-md border p-1.5',
          dark ? 'border-[#2B2A27] bg-[#171716]' : 'border-[#E6E5E1] bg-white',
        )}
      >
        <span className="h-1.5 w-6 rounded-full bg-[#D71920]" />
        <span className={cn('h-1 w-10 rounded-full', dark ? 'bg-[#5C5A55]' : 'bg-[#D4D2CC]')} />
        <span className={cn('h-1 w-7 rounded-full', dark ? 'bg-[#5C5A55]' : 'bg-[#D4D2CC]')} />
      </span>
    </span>
  );
  return (
    <span className="flex h-20 w-full" aria-hidden>
      {kind === 'system' ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(kind === 'dark')
      )}
    </span>
  );
}

/** Full language chooser for the settings page. */
export function LanguageChooser() {
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  return (
    <div role="radiogroup" aria-label={t('Bahasa', 'Language')} className="grid grid-cols-2 gap-2.5">
      {LANGS.map((l) => {
        const active = l.value === lang;
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && setLang(l.value)}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all',
              active ? 'border-brand bg-brand-pale ring-2 ring-brand/20' : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full font-mono text-[12px] font-bold',
                active ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-700',
              )}
              aria-hidden
            >
              {l.short}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold leading-tight text-ink">{l.label}</span>
              <span className="block text-[11.5px] leading-tight text-muted">{l.native}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
