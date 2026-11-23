/**
 * SiagaAI secure AI gateway.
 *
 *   React PWA ──► /api/ai (this) ──► Gemini │ Groq │ OpenRouter
 *
 * - API keys live only in server env vars, never in the browser bundle.
 * - Request validation, payload size limit, per-IP rate limiting.
 * - Structured prompts with strict JSON output, schema-validated; an invalid
 *   answer from one provider falls through to the next.
 * - If no provider is configured/available the client uses its local,
 *   deterministic reasoner — the app never breaks.
 */
import {
  validateOutput,
  validateRequest,
  type AiTask,
  type ChatMessage,
} from "../../ai/contracts.ts";
import { buildPrompt, PROMPT_VERSION } from "../../ai/prompts.ts";
import {
  clientIp,
  fetchWithTimeout,
  json,
  preflight,
  rateLimit,
  type Env,
} from "./http.ts";

const MAX_BODY_BYTES = 32_000;

interface ProviderResult {
  text: string;
  provider: string;
  model: string;
}

/** Carries the upstream HTTP status so the gateway can decide what to try next. */
class ProviderError extends Error {
  readonly status: number;
  constructor(provider: string, model: string, status: number) {
    super(`${provider} ${model} ${status}`);
    this.status = status;
  }
}

type Provider = (
  system: string,
  messages: ChatMessage[],
  env: Env,
  task: AiTask,
  model: string,
  timeoutMs: number,
) => Promise<ProviderResult>;

/**
 * Vercel Edge Functions must start responding within 25 s, so every provider
 * attempt shares one deadline. Providers retire models without notice; each
 * one therefore has a chain of candidates (the env override first), and a
 * retired / overloaded model falls through to the next candidate.
 */
const DEADLINE_MS = 22_000;
const ATTEMPT_TIMEOUT_MS = 13_000;
const MIN_ATTEMPT_MS = 2_500;
/** Time kept back for each fallback provider, so a slow primary cannot starve it. */
const RESERVE_PER_FALLBACK_MS = 7_000;

const temperatureFor = (task: AiTask) => (task === "assistant" ? 0.5 : 0.35);

const gemini: Provider = async (system, messages, env, task, model, timeoutMs) => {
  const call = (withThinkingOff: boolean) => {
    const generationConfig: Record<string, unknown> = {
      temperature: temperatureFor(task),
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    };
    // Short structured answers do not need "thinking"; it only adds latency.
    if (withThinkingOff)
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    return fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig,
          safetySettings: [
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH",
            },
          ],
        }),
      },
      timeoutMs,
    );
  };
  const started = Date.now();
  let res = await call(true);
  // Some models only run in thinking mode and reject a zero budget.
  if (res.status === 400 && Date.now() - started < timeoutMs / 2)
    res = await call(false);
  if (!res.ok) throw new ProviderError("gemini", model, res.status);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("") ?? "";
  return { text, provider: "Google Gemini", model };
};

const openAiCompatible =
  (name: string, url: string, keyVar: string): Provider =>
  async (system, messages, env, task, model, timeoutMs) => {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env[keyVar]}`,
          ...(name === "OpenRouter"
            ? {
                "http-referer": "https://siaga-ai-rush.vercel.app",
                "x-title": "SiagaAI",
              }
            : {}),
        },
        body: JSON.stringify({
          model,
          temperature: temperatureFor(task),
          max_tokens: 2400,
          response_format: { type: "json_object" },
          // Reasoning models: keep the hidden reasoning short for latency.
          ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
          messages: [{ role: "system", content: system }, ...messages],
        }),
      },
      timeoutMs,
    );
    if (!res.ok) throw new ProviderError(name, model, res.status);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      provider: name,
      model,
    };
  };

interface ProviderSpec {
  key: string;
  modelVar: string;
  /** Tried in order after the env override; first entry is the default. */
  models: string[];
  run: Provider;
}

export const PROVIDERS: ProviderSpec[] = [
  {
    key: "GEMINI_API_KEY",
    modelVar: "GEMINI_MODEL",
    models: ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"],
    run: gemini,
  },
  {
    key: "GROQ_API_KEY",
    modelVar: "GROQ_MODEL",
    models: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"],
    run: openAiCompatible(
      "Groq",
      "https://api.groq.com/openai/v1/chat/completions",
      "GROQ_API_KEY",
    ),
  },
  {
    key: "OPENROUTER_API_KEY",
    modelVar: "OPENROUTER_MODEL",
    models: ["meta-llama/llama-3.3-70b-instruct:free", "openrouter/free"],
    run: openAiCompatible(
      "OpenRouter",
      "https://openrouter.ai/api/v1/chat/completions",
      "OPENROUTER_API_KEY",
    ),
  },
];

/** Model candidates for a provider: env override first, then defaults, no duplicates. */
export function modelCandidates(spec: ProviderSpec, env: Env): string[] {
  const override = env[spec.modelVar]?.trim();
  return [...new Set([...(override ? [override] : []), ...spec.models])];
}

/** Extracts the first JSON object from a model reply (tolerates stray code fences). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Output safety: strip markup/links the UI should not render, cap lengths. */
function sanitize<T>(value: T): T {
  if (typeof value === "string")
    return value
      .replace(/<[^>]*>/g, "")
      .replace(/\[([^\]]+)\]\((?:javascript|data):[^)]*\)/gi, "$1")
      .slice(0, 2400) as T;
  if (Array.isArray(value)) return value.map(sanitize) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitize(v)]),
    ) as T;
  return value;
}

export function aiStatus(env: Env) {
  return PROVIDERS.filter((p) => !!env[p.key]).map((p) =>
    p.key.replace("_API_KEY", "").toLowerCase(),
  );
}

export async function handleAi(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") return preflight();
  if (req.method === "GET")
    return json({ configured: aiStatus(env), promptVersion: PROMPT_VERSION });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const limit = rateLimit(`ai:${clientIp(req)}`, 24, 60_000);
  if (!limit.ok)
    return json({ error: "rate_limited" }, 429, {
      "retry-after": String(limit.retryAfter),
    });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES)
    return json({ error: "payload_too_large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = validateRequest(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { task, context, messages } = parsed.value;

  const available = PROVIDERS.filter((p) => !!env[p.key]);
  if (available.length === 0) return json({ error: "ai_not_configured" }, 503);

  const prompt = buildPrompt(task, context, messages);
  const errors: string[] = [];
  const started = Date.now();
  providers: for (const [index, p] of available.entries()) {
    const reserve = (available.length - 1 - index) * RESERVE_PER_FALLBACK_MS;
    for (const model of modelCandidates(p, env)) {
      const remaining = DEADLINE_MS - reserve - (Date.now() - started);
      if (remaining < MIN_ATTEMPT_MS) continue providers;
      try {
        const result = await p.run(
          prompt.system,
          prompt.messages,
          env,
          task,
          model,
          Math.min(ATTEMPT_TIMEOUT_MS, remaining),
        );
        const output = validateOutput(task, extractJson(result.text));
        if (!output) {
          errors.push(`${result.provider} ${model}: schema_mismatch`);
          continue;
        }
        return json({
          task,
          output: sanitize(output),
          provider: result.provider,
          model: result.model,
          generatedAt: new Date().toISOString(),
          promptVersion: PROMPT_VERSION,
        });
      } catch (e) {
        errors.push(
          (e as Error).name === "AbortError"
            ? `${p.modelVar} ${model}: timeout`
            : (e as Error).message,
        );
        // A rejected key will fail for every model of this provider.
        if (e instanceof ProviderError && (e.status === 401 || e.status === 403))
          continue providers;
      }
    }
  }
  return json({ error: "ai_unavailable", detail: errors }, 502);
}
