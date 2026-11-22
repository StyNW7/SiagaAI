import { ArrowUp, Gauge, MapPin, RotateCcw, Sparkles, ThermometerSun, UserRound, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { AiThinking, RichText } from '@/components/common/layout-bits';
import { Button } from '@/components/ui/button';
import { SheetContent } from '@/components/ui/overlays';
import { useAiContext } from '@/hooks/use-ai';
import { useMediaQuery } from '@/hooks/use-misc';
import { RISK_LEVELS } from '@/lib/risk-levels';
import { cn, sanitizeText } from '@/lib/utils';
import { requestAi } from '@/services/ai/client';
import { useAssistantStore } from '@/stores';

const SUGGESTIONS = [
  'Kenapa skor saya seperti ini?',
  'Saya naik motor ke kampus jam 8 besok. Bagaimana?',
  'Apa yang perlu saya siapkan?',
  'Bagaimana skor dihitung?',
  'Kapan waktu aman keluar rumah?',
  'Apakah anak dan orang tua saya perlu waspada?',
];

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
            'group fixed right-4 z-40 flex items-center gap-2 rounded-full bg-ai py-3 pl-3.5 pr-4 text-sm font-semibold text-white shadow-float transition-all hover:bg-indigo-700 hover:pr-5 sm:right-6',
            onMap ? 'bottom-24 md:bottom-6' : 'bottom-20 md:bottom-6',
          )}
          style={desktop && offsetRight ? { right: offsetRight + 24 } : undefined}
          aria-label="Tanya SiagaAI"
        >
          <span className="relative grid size-6 place-items-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/40" aria-hidden />
            <Sparkles className="relative size-5" aria-hidden />
          </span>
          <span className={cn(onMap && 'hidden sm:inline')}>Tanya SiagaAI</span>
        </button>
      </DialogPrimitive.Trigger>
      {open && (
        <SheetContent
          side={desktop ? 'right' : 'bottom'}
          title="Tanya SiagaAI"
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
        content: 'Maaf, SiagaAI sedang tidak dapat menjawab. Coba lagi sebentar.',
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
          <span className="grid size-10 place-items-center rounded-xl bg-ai text-white">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-[15px] font-bold">Tanya SiagaAI</h2>
            <p className="text-[12px] text-muted">
              Asisten kontekstual — memahami lokasi, skor & profil Anda
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon-sm" onClick={clear} aria-label="Mulai percakapan baru">
              <RotateCcw />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Tutup asisten">
            <X />
          </Button>
        </div>
      </div>

      {context && (
        <div
          className="flex gap-1.5 overflow-x-auto border-b border-line bg-neutral-50/70 px-5 py-2.5 scrollbar-none"
          aria-label="Konteks yang dipahami AI"
        >
          <Ctx icon={<MapPin />} text={context.location.name} />
          <Ctx icon={<Gauge />} text={`Skor ${context.risk.personal.score} · ${level?.label}`} />
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
            <p className="text-[15px] font-semibold">
              Halo! Ada yang ingin Anda ketahui tentang kondisi di {context?.location.name ?? 'lokasi Anda'}?
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Jawaban berlandaskan data BMKG, NASA FIRMS & Open-Meteo yang sudah dihitung Siaga Risk Engine.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={!context}
                  className="rounded-xl border border-indigo-100 bg-ai-soft/40 px-3.5 py-2.5 text-left text-[13px] font-medium text-indigo-950 transition-colors hover:bg-ai-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div
              key={m.id}
              className="ml-10 rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14px] text-white"
            >
              {m.content}
            </div>
          ) : (
            <div key={m.id} className="mr-4 animate-fade-up">
              <div
                className={cn(
                  'rounded-2xl rounded-bl-md border px-4 py-3',
                  m.error ? 'border-amber-200 bg-amber-50' : 'border-indigo-100 bg-white',
                )}
              >
                <RichText text={m.content} />
              </div>
              {m.provider && <p className="mt-1 pl-1 text-[11px] text-muted">✦ {m.provider}</p>}
            </div>
          ),
        )}
        {busy && (
          <div className="mr-4 rounded-2xl border border-indigo-100 bg-white px-4 py-3">
            <AiThinking />
          </div>
        )}
        {!busy && last?.role === 'assistant' && last.followUps && last.followUps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {last.followUps.map((f) => (
              <button
                key={f}
                onClick={() => ask(f)}
                className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-ai hover:bg-ai-soft"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="safe-bottom border-t border-line bg-white p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-white p-1.5 focus-within:border-ai focus-within:ring-4 focus-within:ring-ai/10">
          <label htmlFor="assistant-input" className="sr-only">
            Pertanyaan untuk SiagaAI
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
            placeholder={context ? 'Tanyakan kondisi, perjalanan, persiapan…' : 'Menunggu data lokasi…'}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] outline-none placeholder:text-neutral-400"
          />
          <Button
            type="submit"
            variant="ai"
            size="icon-sm"
            disabled={!input.trim() || busy || !context}
            aria-label="Kirim pertanyaan"
            className="rounded-xl"
          >
            <ArrowUp />
          </Button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted">
          SiagaAI memberi informasi pendukung keputusan, bukan arahan resmi. Darurat: 112.
        </p>
      </form>
    </div>
  );
}

function Ctx({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 ring-1 ring-line [&_svg]:size-3 [&_svg]:text-ai">
      {icon}
      {text}
    </span>
  );
}
