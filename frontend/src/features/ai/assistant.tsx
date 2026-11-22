import { ArrowUp, Gauge, MapPin, RotateCcw, Sparkles, ThermometerSun, UserRound, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Ara } from '@/components/common/ara';
import { AiThinking, RichText } from '@/components/common/layout-bits';
import { Button } from '@/components/ui/button';
import { SheetContent } from '@/components/ui/overlays';
import { useAiContext } from '@/hooks/use-ai';
import { useMediaQuery } from '@/hooks/use-misc';
import { RISK_LEVELS } from '@/lib/risk-levels';
import { cn, sanitizeText } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { requestAi } from '@/services/ai/client';
import { useAssistantStore } from '@/stores';

const suggestions = () => [
  t('Kenapa skor saya seperti ini?', 'Why is my score like this?'),
  t('Saya naik motor ke kampus jam 8 besok. Bagaimana?', "I'm riding a motorcycle to campus at 8 tomorrow. How does it look?"),
  t('Apa yang perlu saya siapkan?', 'What should I prepare?'),
  t('Bagaimana skor dihitung?', 'How is the score calculated?'),
  t('Kapan waktu aman keluar rumah?', 'When is it safe to go out?'),
  t('Apakah anak dan orang tua saya perlu waspada?', 'Should my children and parents be cautious?'),
];

/** Ara's face, cropped from the waving pose — used as the assistant avatar. */
export function AraAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-brand-pale to-brand-soft ring-1 ring-brand/15',
        className,
      )}
      aria-hidden
    >
      <img
        src="/mascot/ara-hero-wave.webp"
        alt=""
        className="absolute left-1/2 top-[6%] w-[175%] max-w-none -translate-x-[46%]"
        draggable={false}
      />
    </span>
  );
}

export function AssistantLauncher() {
  const { open, setOpen, offsetRight } = useAssistantStore();
  const { pathname } = useLocation();
  const desktop = useMediaQuery('(min-width: 768px)');
  const onMap = pathname.startsWith('/app/map');
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          className={cn(
            'group fixed right-4 z-40 flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 text-[14px] font-semibold text-ink shadow-lift transition-all duration-200 hover:-translate-y-0.5 hover:border-ai/30 hover:shadow-float sm:right-6',
            onMap ? 'bottom-40 md:bottom-6' : 'bottom-20 md:bottom-6',
          )}
          style={desktop && offsetRight ? { right: offsetRight + 24 } : undefined}
          aria-label={t('Tanya Ara, asisten SiagaAI', 'Ask Ara, the SiagaAI assistant')}
        >
          <AraAvatar className="size-10" />
          <span className={cn('hidden flex-col items-start leading-tight', !onMap && 'sm:flex')}>
            {t('Tanya Ara', 'Ask Ara')}
            <span className="flex items-center gap-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] text-ai">
              <Sparkles className="size-2.5" aria-hidden /> AI Assistant
            </span>
          </span>
        </button>
      </DialogPrimitive.Trigger>
      {open && (
        <SheetContent
          side={desktop ? 'right' : 'bottom'}
          title={t('Tanya SiagaAI', 'Ask SiagaAI')}
          hideTitle
          className={desktop ? '' : 'h-[88dvh]'}
        >
          <AssistantPanel />
        </SheetContent>
      )}
    </DialogPrimitive.Root>
  );
}

function AssistantPanel() {
  const { messages, push, clear, setOpen, consumePending } = useAssistantStore();
  const context = useAiContext();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const ask = async (q: string) => {
    const question = sanitizeText(q, 600);
    if (!question || busy || !context) return;
    push({ role: 'user', content: question });
    setInput('');
    setBusy(true);
    const history = [...useAssistantStore.getState().messages]
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));
    try {
      const r = await requestAi('assistant', context, { messages: history });
      push({
        role: 'assistant',
        content: r.output.answer,
        provider: r.provider,
        followUps: r.output.followUps,
      });
    } catch {
      push({
        role: 'assistant',
        content: t(
          'Maaf, SiagaAI sedang tidak dapat menjawab. Coba lagi sebentar.',
          "Sorry, SiagaAI can't answer right now. Please try again shortly.",
        ),
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const hasContext = !!context;
  useEffect(() => {
    if (!hasContext) return;
    const pending = consumePending();
    if (pending) void ask(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasContext]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  const level = context ? RISK_LEVELS[context.risk.personal.level] : null;
  const last = messages.at(-1);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <AraAvatar className="size-11" />
          <div>
            <h2 className="text-[16px] font-bold tracking-[-0.02em]">{t('Ara · Asisten SiagaAI', 'Ara · SiagaAI Assistant')}</h2>
            <p className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted">
              <span className="size-1.5 rounded-full bg-risk-safe" aria-hidden />{' '}
              {t('Paham lokasi, skor & profil Anda', 'Knows your location, score & profile')}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon-sm" onClick={clear} aria-label={t('Mulai percakapan baru', 'Start a new conversation')}>
              <RotateCcw />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label={t('Tutup asisten', 'Close assistant')}>
            <X />
          </Button>
        </div>
      </div>

      {context && (
        <div
          className="flex gap-1.5 overflow-x-auto border-b border-line bg-raised px-5 py-2.5 scrollbar-none"
          aria-label={t('Konteks yang dipahami AI', 'Context understood by the AI')}
        >
          <Ctx icon={<MapPin />} text={context.location.name} />
          <Ctx icon={<Gauge />} text={`${t('Skor', 'Score')} ${context.risk.personal.score} · ${level?.label}`} />
          {context.weather && (
            <Ctx
              icon={<ThermometerSun />}
              text={`${Math.round(context.weather.temperature ?? 0)}°C · ${context.weather.description}`}
            />
          )}
          <Ctx icon={<UserRound />} text={`${context.profile.occupation} · ${context.profile.transport}`} />
        </div>
      )}

      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="animate-fade-up">
            <div className="flex items-end gap-3">
              <Ara pose="wave" size={92} />
              <div className="mb-2 rounded-2xl rounded-bl-md border border-line bg-raised px-4 py-3">
                <p className="text-[15px] font-bold leading-snug">{t('Halo, aku Ara! 👋', "Hi, I'm Ara! 👋")}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  {t(
                    `Mau tahu kondisi di ${context?.location.name ?? 'lokasimu'}? Tanya saja.`,
                    `Want to know the conditions in ${context?.location.name ?? 'your area'}? Just ask.`,
                  )}
                </p>
              </div>
            </div>
            <p className="data-label mb-2 mt-6">{t('Coba tanyakan', 'Try asking')}</p>
            <div className="flex flex-col gap-2">
              {suggestions().map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={!context}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-[13.5px] font-medium text-ink transition-colors hover:border-ai/30 hover:bg-ai-soft/40"
                >
                  {s}
                  <ArrowUp className="size-3.5 shrink-0 rotate-45 text-subtle transition-colors group-hover:text-ai" />
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div
              key={m.id}
              className="ml-10 rounded-2xl rounded-br-md bg-inverse px-4 py-2.5 text-[14px] text-on-inverse"
            >
              {m.content}
            </div>
          ) : (
            <div key={m.id} className="mr-4 animate-fade-up">
              <div
                className={cn(
                  'rounded-2xl rounded-bl-md border px-4 py-3',
                  m.error ? 'border-risk-moderate/30 bg-[var(--risk-moderate-soft)]' : 'border-line bg-surface',
                )}
              >
                <RichText text={m.content} />
              </div>
              {m.provider && (
                <p className="mt-1.5 pl-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ai">
                  ✦ {m.provider}
                </p>
              )}
            </div>
          ),
        )}
        {busy && (
          <div className="mr-4 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
            <AiThinking />
          </div>
        )}
        {!busy && last?.role === 'assistant' && last.followUps && last.followUps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {last.followUps.map((f) => (
              <button
                key={f}
                onClick={() => ask(f)}
                className="rounded-full border border-ai/20 bg-surface px-3 py-1.5 text-[12px] font-semibold text-ai-deep transition-colors hover:bg-ai-soft"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="safe-bottom border-t border-line bg-surface p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-1.5 focus-within:border-ai/50 focus-within:ring-4 focus-within:ring-ai/10">
          <label htmlFor="assistant-input" className="sr-only">
            {t('Pertanyaan untuk SiagaAI', 'Question for SiagaAI')}
          </label>
          <textarea
            id="assistant-input"
            rows={1}
            value={input}
            maxLength={600}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder={
              context
                ? t('Tanyakan kondisi, perjalanan, persiapan…', 'Ask about conditions, trips, preparations…')
                : t('Menunggu data lokasi…', 'Waiting for location data…')
            }
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] outline-none placeholder:text-neutral-400"
          />
          <Button
            type="submit"
            variant="ai"
            size="icon-sm"
            disabled={!input.trim() || busy || !context}
            aria-label={t('Kirim pertanyaan', 'Send question')}
            className="rounded-xl"
          >
            <ArrowUp />
          </Button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted">
          {t(
            'SiagaAI memberi informasi pendukung keputusan, bukan arahan resmi. Darurat: 112.',
            'SiagaAI provides decision-support information, not official instructions. Emergency: 112.',
          )}
        </p>
      </form>
    </div>
  );
}

function Ctx({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-neutral-700 ring-1 ring-line [&_svg]:size-3 [&_svg]:text-ai">
      {icon}
      {text}
    </span>
  );
}
