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

type Provider = (
  system: string,
  messages: ChatMessage[],
  env: Env,
  task: AiTask,
) => Promise<ProviderResult>;

const temperatureFor = (task: AiTask) => (task === "assistant" ? 0.5 : 0.35);

const gemini: Provider = async (system, messages, env, task) => {
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const generationConfig: Record<string, unknown> = {
    temperature: temperatureFor(task),
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
  };
  if (model.includes("2.5-flash"))
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  const res = await fetchWithTimeout(
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
    25_000,
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  return { text, provider: "Google Gemini", model };
};

const openAiCompatible =
  (
    name: string,
    url: string,
    keyVar: string,
    modelVar: string,
    defaultModel: string,
  ): Provider =>
  async (system, messages, env, task) => {
    const model = env[modelVar] || defaultModel;
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env[keyVar]}`,
          ...(name === "OpenRouter"
            ? {
                "http-referer": "https://siagaai.vercel.app",
                "x-title": "SiagaAI",
              }
            : {}),
        },
        body: JSON.stringify({
          model,
          temperature: temperatureFor(task),
          max_tokens: 1800,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, ...messages],
        }),
      },
      25_000,
    );
    if (!res.ok) throw new Error(`${name} ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      provider: name,
      model,
    };
  };

const PROVIDERS: { key: string; run: Provider }[] = [
  { key: "GEMINI_API_KEY", run: gemini },
  {
    key: "GROQ_API_KEY",
    run: openAiCompatible(
      "Groq",
      "https://api.groq.com/openai/v1/chat/completions",
      "GROQ_API_KEY",
      "GROQ_MODEL",
      "llama-3.3-70b-versatile",
    ),
  },
  {
    key: "OPENROUTER_API_KEY",
    run: openAiCompatible(
      "OpenRouter",
      "https://openrouter.ai/api/v1/chat/completions",
      "OPENROUTER_API_KEY",
      "OPENROUTER_MODEL",
      "meta-llama/llama-3.3-70b-instruct:free",
    ),
  },
];

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
  for (const p of available) {
    try {
      const result = await p.run(prompt.system, prompt.messages, env, task);
      const output = validateOutput(task, extractJson(result.text));
      if (!output) {
        errors.push(`${result.provider}: schema_mismatch`);
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
      errors.push((e as Error).message);
    }
  }
  return json({ error: "ai_unavailable", detail: errors }, 502);
}
