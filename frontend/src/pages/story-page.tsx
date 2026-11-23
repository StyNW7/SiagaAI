import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Logo } from '@/components/common/brand';
import { Disclaimer } from '@/components/common/layout-bits';
import { BackToTop } from '@/components/common/reveal';
import { Button } from '@/components/ui/button';
import { PreferenceToggles } from '@/features/preferences/toggles';
import { CHAPTERS } from '@/features/story/data';
import { scrollToId } from '@/features/story/parts';
import { HookSection, ProblemSection, ResearchSection } from '@/features/story/sections-problem';
import { PersonaSection, QuestionSection } from '@/features/story/sections-persona';
import { ArrivesSection, FeaturesSection } from '@/features/story/sections-solution';
import { ClosingSection, ImpactSection, SdgSection, SourcesSection } from '@/features/story/sections-impact';
import { useStoryReturn } from '@/features/story/story-return';
import { useDocumentTitle } from '@/hooks/use-misc';
import { cn } from '@/lib/utils';
import { t, tx } from '@/lib/i18n';

/**
 * "Tentang / About" — the pitch-style story page used in the demo video:
 * facts → problem → research → persona (Ara) → question → SiagaAI → features (live) →
 * impact → SDGs → closing. Feature buttons remember the exact scroll position so the
 * presenter can jump into the app and come straight back to the same spot.
 */
export default function StoryPage() {
  useDocumentTitle(t('Tentang SiagaAI', 'About SiagaAI'));
  const { hash } = useLocation();

  // Back from a live feature: restore the exact place (and feature tab) the reader left.
  useLayoutEffect(() => {
    const r = useStoryReturn.getState().ret;
    if (r && r.path === window.location.pathname) {
      const y = r.scrollY;
      const restore = () => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
      restore();
      // Run again after fonts/images settle so late layout shifts can't move the reader.
      const raf = requestAnimationFrame(restore);
      const timer = setTimeout(() => {
        restore();
        useStoryReturn.getState().clear();
      }, 120);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
    if (hash) {
      const timer = setTimeout(() => scrollToId(hash.slice(1)), 250);
      return () => clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    // Decide once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-x-clip bg-canvas">
      <a
        href="#fakta"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-inverse focus:px-3 focus:py-2 focus:text-on-inverse"
      >
        {t('Lewati ke konten', 'Skip to content')}
      </a>
      <ProgressBar />
      <StoryNav />
      <ChapterRail />
      <main>
        <HookSection />
        <ProblemSection />
        <ResearchSection />
        <PersonaSection />
        <QuestionSection />
        <ArrivesSection />
        <FeaturesSection />
        <ImpactSection />
        <SdgSection />
        <ClosingSection />
        <SourcesSection />
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <Logo />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-muted">
            <Link to="/" className="hover:text-ink">{t('Beranda', 'Home')}</Link>
            <Link to="/app" className="hover:text-ink">Dashboard</Link>
            <Link to="/app/map" className="hover:text-ink">Siaga Map</Link>
            <Link to="/app/about" className="hover:text-ink">{t('Data & Metodologi', 'Data & Methodology')}</Link>
          </nav>
        </div>
        <div className="border-t border-line px-5 py-6 sm:px-8">
          <Disclaimer className="mx-auto max-w-[1240px]" />
        </div>
      </footer>
      <BackToTop />
    </div>
  );
}

/** Thin reading-progress bar along the top edge. */
function ProgressBar() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        if (ref.current) ref.current.style.transform = `scaleX(${p})`;
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="fixed inset-x-0 top-[var(--safe-top)] z-[60] h-[3px] origin-left bg-[linear-gradient(90deg,#f08a24,#d71920_55%,#741116)]"
      style={{ transform: 'scaleX(0)' }}
      aria-hidden
    />
  );
}

function StoryNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className="fixed inset-x-0 top-[var(--safe-top)] z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={cn(
          'mx-auto flex h-14 max-w-[1240px] items-center gap-3 rounded-full pl-4 pr-2 transition-all duration-300',
          scrolled ? 'glass' : 'border border-transparent',
        )}
      >
        <Link to="/" aria-label={t('SiagaAI beranda', 'SiagaAI home')} className="shrink-0">
          <Logo />
        </Link>
        <Link
          to="/"
          className="ml-1 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink md:inline-flex"
        >
          <ArrowLeft className="size-3.5" /> {t('Beranda', 'Home')}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <PreferenceToggles className="hidden gap-1.5 sm:flex" />
          <Button asChild size="sm" className="rounded-full pl-4 pr-3">
            <Link to="/app">
              <span className="hidden sm:inline">{t('Buka aplikasi', 'Open app')}</span>
              <span className="sm:hidden">{t('Buka', 'Open')}</span> <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Slide-style chapter navigation on the right edge (wide desktop). */
function ChapterRail() {
  const [active, setActive] = useState(CHAPTERS[0].id);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        }),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label={t('Bab', 'Chapters')} className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 min-[1400px]:block">
      <ol className="glass flex flex-col gap-1 rounded-full p-1.5">
        {CHAPTERS.map((c) => {
          const on = c.id === active;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => scrollToId(c.id)}
                aria-label={`${c.n} · ${tx(c.label)}`}
                aria-current={on ? 'step' : undefined}
                className="group relative grid size-8 place-items-center rounded-full"
              >
                <span
                  className={cn(
                    'tabular grid size-7 place-items-center rounded-full font-mono text-[10px] font-semibold transition-all duration-300',
                    on ? 'bg-brand text-white shadow-soft' : 'text-subtle group-hover:bg-neutral-100 group-hover:text-ink',
                  )}
                >
                  {c.n}
                </span>
                <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-inverse px-2.5 py-1 text-[12px] font-semibold text-on-inverse opacity-0 shadow-lift transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  {tx(c.label)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
