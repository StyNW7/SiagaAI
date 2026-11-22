/** Runtime-agnostic HTTP helpers (Vercel Edge, Node 18+, Deno / Supabase Edge Functions). */

export type Env = Record<string, string | undefined>;

export const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers":
    "content-type, authorization, apikey, x-client-info",
  "access-control-max-age": "86400",
};

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

export const preflight = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort sliding-window rate limiter (per instance). Serverless instances
 * are ephemeral, so this protects against bursts; provider quotas remain the
 * hard limit. For production use a shared store (Upstash/Supabase).
 */
const buckets = new Map<string, number[]>();
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return {
      ok: false,
      retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000),
    };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return { ok: true, retryAfter: 0 };
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "anon";
