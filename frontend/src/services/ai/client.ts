/**
 * AI client: secure gateway first (`/api/ai` or VITE_AI_ENDPOINT, e.g. a
 * Supabase Edge Function), then the deterministic local reasoner.
 * Responses are cached per (task, context fingerprint) for 30 minutes.
 */
import {
  validateOutput,
  type AiContext,
  type AiOutputMap,
  type AiTask,
  type ChatMessage,
} from '@ai/contracts';
import { hash } from '@/lib/utils';
import { localReason } from './local-reasoner';

const ENDPOINT = (import.meta.env.VITE_AI_ENDPOINT as string | undefined) || '/api/ai';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const TTL = 30 * 60_000;

export interface AiResult<T extends AiTask> {
  output: AiOutputMap[T];
  provider: string;
  model: string;
  generatedAt: string;
  fallback: boolean;
  fallbackReason?: string;
}

const memory = new Map<string, { at: number; value: AiResult<AiTask> }>();

function fingerprint(task: AiTask, context: AiContext, messages?: ChatMessage[]) {
  const { generatedAt: _g, ...stable } = context;
  return `${task}:${hash(JSON.stringify(stable) + JSON.stringify(messages ?? []))}`;
}

function readCache<T extends AiTask>(key: string): AiResult<T> | null {
  const m = memory.get(key);
  if (m && Date.now() - m.at < TTL) return m.value as AiResult<T>;
  try {
    const raw = sessionStorage.getItem(`siaga.ai.${key}`);
    if (raw) {
      const parsed = JSON.parse(raw) as { at: number; value: AiResult<T> };
      if (Date.now() - parsed.at < TTL) return parsed.value;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(key: string, value: AiResult<AiTask>) {
  const entry = { at: Date.now(), value };
  memory.set(key, entry);
  try {
    sessionStorage.setItem(`siaga.ai.${key}`, JSON.stringify(entry));
  } catch {
    /* quota — ignore */
  }
}

/** Tracks whether the remote gateway is reachable, to avoid repeated slow failures. */
let gatewayDownUntil = 0;

export async function requestAi<T extends AiTask>(
  task: T,
  context: AiContext,
  options: { messages?: ChatMessage[]; signal?: AbortSignal; skipCache?: boolean } = {},
): Promise<AiResult<T>> {
  const key = fingerprint(task, context, options.messages);
  if (!options.skipCache && task !== 'assistant') {
    const cached = readCache<T>(key);
    if (cached) return cached;
  }

  let reason = 'offline';
  if (navigator.onLine && Date.now() > gatewayDownUntil) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 28_000);
      options.signal?.addEventListener('abort', () => controller.abort(), { once: true });
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(ANON && ENDPOINT.includes('supabase') ? { authorization: `Bearer ${ANON}`, apikey: ANON } : {}),
        },
        body: JSON.stringify({ task, context, messages: options.messages }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as {
          output: unknown;
          provider: string;
          model: string;
          generatedAt: string;
        };
        const output = validateOutput(task, data.output);
        if (output) {
          const result: AiResult<T> = {
            output,
            provider: data.provider,
            model: data.model,
            generatedAt: data.generatedAt,
            fallback: false,
          };
          writeCache(key, result as AiResult<AiTask>);
          return result;
        }
        reason = 'invalid_output';
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        reason = err.error ?? `http_${res.status}`;
        if (res.status === 503 || res.status === 404) gatewayDownUntil = Date.now() + 5 * 60_000;
      }
    } catch (e) {
      if (options.signal?.aborted) throw e;
      reason = 'unreachable';
      gatewayDownUntil = Date.now() + 60_000;
    }
  }

  const result: AiResult<T> = {
    output: localReason(task, context, options.messages),
    provider: 'SiagaAI Local Reasoner',
    model: 'rules-v1',
    generatedAt: new Date().toISOString(),
    fallback: true,
    fallbackReason: reason,
  };
  if (task !== 'assistant') writeCache(key, result as AiResult<AiTask>);
  return result;
}

export const FALLBACK_REASONS: Record<string, string> = {
  ai_not_configured: 'Kunci LLM belum dikonfigurasi di server',
  offline: 'Perangkat sedang offline',
  unreachable: 'Gateway AI tidak dapat dijangkau',
  rate_limited: 'Batas permintaan AI tercapai sementara',
  ai_unavailable: 'Penyedia LLM sedang tidak tersedia',
  invalid_output: 'Jawaban LLM tidak lolos validasi skema',
};
