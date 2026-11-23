import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Ara } from '@/components/common/ara';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'siaga.install.dismissedAt';
const SNOOZE_MS = 14 * 24 * 3_600_000;

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

/** Whether the browser offered installation, plus a function to trigger it. */
export function useInstallPrompt() {
  const [available, setAvailable] = useState(() => !!deferred);
  useEffect(() => {
    const on = () => setAvailable(!!deferred);
    listeners.add(on);
    return () => void listeners.delete(on);
  }, []);
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    listeners.forEach((l) => l());
    return outcome === 'accepted';
  };
  return { available, install };
}

/** Small, dismissible install card — appears after the user has spent a moment in the app. */
export function InstallPrompt() {
  const { available, install } = useInstallPrompt();
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(() => {
    const at = Number(localStorage.getItem(KEY) ?? 0);
    return Date.now() - at < SNOOZE_MS;
  });
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 25_000);
    return () => clearTimeout(timer);
  }, []);

  if (!available || hidden || !ready) return null;
  const dismiss = () => {
    localStorage.setItem(KEY, String(Date.now()));
    setHidden(true);
  };
  return (
    <div
      role="dialog"
      aria-label={t('Instal SiagaAI', 'Install SiagaAI')}
      className="glass fixed bottom-[calc(5.5rem+var(--safe-bottom))] left-3 right-3 z-40 flex animate-sheet-up items-end gap-3 rounded-[18px] py-3 pl-2 pr-3 sm:left-auto sm:right-6 sm:w-[360px] md:bottom-[calc(6rem+var(--safe-bottom))]"
    >
      <Ara pose="run" size={72} className="-mb-1" />
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-[14px] font-bold leading-tight">{t('Pasang SiagaAI', 'Install SiagaAI')}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
          {t('Buka lebih cepat & tetap bisa dipakai offline.', 'Opens faster & keeps working offline.')}
        </p>
        <Button
          size="sm"
          className="mt-2.5"
          onClick={async () => {
            await install();
            dismiss();
          }}
        >
          <Download /> {t('Instal', 'Install')}
        </Button>
      </div>
      <button
        onClick={dismiss}
        aria-label={t('Tutup', 'Close')}
        className="grid size-8 shrink-0 place-items-center self-start rounded-full text-subtle transition-colors hover:bg-surface hover:text-ink"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
