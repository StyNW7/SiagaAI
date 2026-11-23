import { ArrowLeft, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { LogoMark } from '@/components/common/brand';
import { cn } from '@/lib/utils';
import { t, tx } from '@/lib/i18n';
import { useStoryReturn } from './story-return';

/** Floating "back to the story" pill shown after jumping from the About page into a live feature. */
export function ReturnToStory({ className }: { className?: string }) {
  const ret = useStoryReturn((s) => s.ret);
  const clear = useStoryReturn((s) => s.clear);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (!ret || pathname === ret.path) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-[calc(5rem+var(--safe-bottom))] z-[45] flex justify-center px-4 md:bottom-[calc(1.5rem+var(--safe-bottom))]',
        className,
      )}
    >
      <div className="pointer-events-auto flex max-w-full animate-sheet-up items-center gap-1 rounded-full bg-night p-1 text-white shadow-[0_18px_44px_-14px_rgb(0_0_0/0.6)] ring-1 ring-white/10 dark:bg-[#f4f3ef] dark:text-[#111110] dark:ring-black/5">
        <button
          type="button"
          onClick={() => navigate(ret.path)}
          className="group flex min-w-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 text-left transition-colors hover:bg-white/10 dark:hover:bg-black/5"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          </span>
          <LogoMark className="hidden size-7 sm:block" />
          <span className="min-w-0 truncate text-[13.5px] font-semibold">
            {t('Kembali ke Tentang SiagaAI', 'Back to About SiagaAI')}
            <span className="hidden font-medium opacity-60 sm:inline"> · {tx(ret.label)}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={clear}
          aria-label={t('Tutup', 'Dismiss')}
          className="grid size-8 shrink-0 place-items-center rounded-full opacity-60 transition hover:bg-white/10 hover:opacity-100 dark:hover:bg-black/5"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
