import { assertAllowedSourceUrl } from './source-policy';

const blockedRequestHeaders = new Set([
  'connection', 'content-length', 'forwarded', 'host', 'proxy-authorization',
  'proxy-connection', 'te', 'trailer', 'transfer-encoding', 'upgrade',
  'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
]);

export interface SourceFetchOptions extends Omit<RequestInit, 'redirect'> {
  sourceId: string;
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  beforeRequest?: (url: URL, headers: Headers) => void | Promise<void>;
  onResponse?: (response: Response, url: URL) => void | Promise<void>;
}

export interface SourceFetchResult {
  url: string;
  status: number;
  headers: Headers;
  body: Uint8Array;
}

function sanitizeHeaders(input?: HeadersInit): Headers {
  const headers = new Headers(input);
  for (const name of Array.from(headers.keys())) {
    if (blockedRequestHeaders.has(name.toLocaleLowerCase()) || name.toLocaleLowerCase().startsWith('cf-')) headers.delete(name);
  }
  return headers;
}

function createTimeoutSignal(parent: AbortSignal | null | undefined, timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parent?.reason);
  parent?.addEventListener('abort', abortFromParent, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('Source request timed out')), timeoutMs);

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', abortFromParent);
    },
  };
}

export async function fetchSourceStream(rawUrl: string, options: SourceFetchOptions): Promise<Response> {
  const { sourceId, timeoutMs = 15_000, maxRedirects = 5, maxBytes = 25 * 1024 * 1024, beforeRequest, onResponse, ...requestInit } = options;
  const baseHeaders = sanitizeHeaders(requestInit.headers);
  let url = assertAllowedSourceUrl(sourceId, rawUrl);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const headers = new Headers(baseHeaders);
    await beforeRequest?.(url, headers);
    const timeout = createTimeoutSignal(requestInit.signal, timeoutMs);
    let response: Response;
    try {
      response = await sourceFetch(sourceId, url, { ...requestInit, headers, signal: timeout.signal, redirect: 'manual' });
    } finally {
      timeout.dispose();
    }
    await onResponse?.(response, url);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      if (redirectCount === maxRedirects) throw new Error('Source redirect limit exceeded');
      url = assertAllowedSourceUrl(sourceId, new URL(location, url).toString());
      continue;
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error('Source response exceeds size limit');
    return response;
  }

  throw new Error('Source redirect limit exceeded');
}

async function sourceFetch(sourceId: string, url: URL, init: RequestInit): Promise<Response> {
  const gatewayUrl = process.env.XIRUO_SOURCE_GATEWAY?.trim();
  if (!gatewayUrl) return fetch(url, init);
  assertLocalGatewayUrl(gatewayUrl);
  const secret = process.env.XIRUO_PROXY_SECRET;
  if (!secret) throw new Error('Source gateway requires XIRUO_PROXY_SECRET');

  return fetch(gatewayUrl, {
    method: 'POST',
    signal: init.signal,
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({ sourceId, url: url.toString(), method: init.method ?? 'GET', headers: Object.fromEntries(new Headers(init.headers)), body: serializeBody(init.body) }),
  });
}

function assertLocalGatewayUrl(rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid source gateway URL');
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Source gateway must be local HTTP');
}

function serializeBody(body: BodyInit | null | undefined): string | undefined {
  if (body == null) return undefined;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  throw new Error('Source gateway does not support this request body type');
}

export async function fetchSource(rawUrl: string, options: SourceFetchOptions): Promise<SourceFetchResult> {
  const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
  const response = await fetchSourceStream(rawUrl, { ...options, maxBytes });
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > maxBytes) throw new Error('Source response exceeds size limit');

  return { url: response.url || rawUrl, status: response.status, headers: response.headers, body: buffer };
}
