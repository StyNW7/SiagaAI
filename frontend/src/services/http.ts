export class ServiceError extends Error {
  constructor(
    message: string,
    readonly service: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  service?: string;
}

/** fetch() with timeout, abort propagation and typed errors. */
export async function fetchWithTimeout(
  url: string,
  { timeoutMs = 12_000, service = 'network', signal, ...init }: FetchOptions = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new ServiceError(`${service} responded ${res.status}`, service, res.status);
    return res;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    const timedOut =
      controller.signal.reason instanceof DOMException && controller.signal.reason.name === 'TimeoutError';
    throw new ServiceError(timedOut ? `${service} timed out` : `${service} unreachable`, service);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function fetchJson<T>(url: string, options?: FetchOptions): Promise<T> {
  const res = await fetchWithTimeout(url, options);
  return (await res.json()) as T;
}

export const nowIso = () => new Date().toISOString();
