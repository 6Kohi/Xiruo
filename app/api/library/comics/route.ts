import type { ContentDetails, ContentItem } from '@/lib/sources/contracts';
import { NhentaiSource } from '@/lib/sources/nhentai/source';

const source = new NhentaiSource();
const defaultCacheService = 'http://127.0.0.1:4011';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') ?? 'list';
    if (action === 'list') {
      const response = await cacheRequest('/comics', { signal: request.signal });
      return proxyJson(response, (data) => ({ items: ((data as { items?: CachedComic[] }).items ?? []).map(withCachedCover) }));
    }
    if (action === 'details') {
      const id = requiredId(url);
      const response = await cacheRequest(`/comics/details?sourceId=nhentai&id=${encodeURIComponent(id)}`, { signal: request.signal });
      return proxyJson(response, (data) => withCachedCover(data as CachedComic));
    }
    if (action === 'chapter') {
      const id = requiredId(url);
      const response = await cacheRequest(`/comics/chapter?sourceId=nhentai&id=${encodeURIComponent(id)}`, { signal: request.signal });
      return proxyJson(response, (data) => ({
        images: Array.from({ length: Number((data as { count?: number }).count) || 0 }, (_, index) => cachedMediaUrl(id, 'page', index + 1)),
      }));
    }
    if (action === 'cover' || action === 'page') {
      const id = requiredId(url);
      const index = action === 'page' ? requiredPage(url) : undefined;
      const params = new URLSearchParams({ sourceId: 'nhentai', id, kind: action });
      if (index) params.set('index', String(index));
      const response = await cacheRequest(`/comics/media?${params}`, { signal: request.signal, headers: forwardConditionalHeaders(request.headers) });
      return proxyMedia(response);
    }
    return Response.json({ error: 'Unknown comic library action' }, { status: 400 });
  } catch (error) {
    return libraryError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (process.env.XIRUO_ENABLE_REAL_SOURCES !== 'true') return Response.json({ error: 'Real sources are disabled' }, { status: 503 });
    const payload = await request.json() as { item?: ContentItem };
    if (!payload.item || payload.item.kind !== 'comic' || payload.item.sourceId !== 'nhentai') {
      return Response.json({ error: 'Only nhentai comics can be cached currently' }, { status: 400 });
    }
    const context = { signal: request.signal, locale: 'zh-CN' };
    const [details, pages] = await Promise.all([
      source.getDetails(payload.item.id, context),
      source.getChapter(payload.item.id, 'default', context),
    ]);
    const response = await cacheRequest('/comics', {
      method: 'POST',
      signal: request.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId: 'nhentai', id: details.id, item: details, coverUrl: details.coverUrl, pages }),
    });
    return proxyJson(response, (data) => withCachedCover(data as CachedComic));
  } catch (error) {
    return libraryError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = requiredId(url);
    const response = await cacheRequest(`/comics?sourceId=nhentai&id=${encodeURIComponent(id)}`, { method: 'DELETE', signal: request.signal });
    return proxyJson(response);
  } catch (error) {
    return libraryError(error);
  }
}

interface CachedComic extends ContentDetails {
  savedAt: number;
  cacheStatus: 'downloading' | 'ready' | 'error';
  cachedPages: number;
  totalPages: number;
  cacheError?: string;
  coverCached?: boolean;
}

async function cacheRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const secret = process.env.XIRUO_PROXY_SECRET;
  if (!secret) throw new Error('Offline cache is not configured');
  const baseUrl = process.env.XIRUO_CACHE_SERVICE?.trim() || defaultCacheService;
  assertLocalCacheService(baseUrl);
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${secret}`);
  return fetch(new URL(path, baseUrl), { ...init, headers });
}

function assertLocalCacheService(rawUrl: string): void {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Cache service must use local HTTP');
}

function requiredId(url: URL): string {
  const id = url.searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) throw new Error('Invalid comic id');
  return id;
}

function requiredPage(url: URL): number {
  const page = Number(url.searchParams.get('page'));
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Invalid comic page');
  return page;
}

function withCachedCover<T extends CachedComic>(item: T): T {
  return { ...item, coverUrl: item.coverCached ? cachedMediaUrl(item.id, 'cover') : item.coverUrl };
}

function cachedMediaUrl(id: string, kind: 'cover' | 'page', page?: number): string {
  const params = new URLSearchParams({ action: kind, id });
  if (page) params.set('page', String(page));
  return `/api/library/comics?${params}`;
}

async function proxyJson(response: Response, transform: (data: unknown) => unknown = (data) => data): Promise<Response> {
  const data = await response.json().catch(() => ({ error: `缓存服务响应异常（HTTP ${response.status}）` }));
  return Response.json(response.ok ? transform(data) : data, { status: response.status, headers: { 'cache-control': 'private, no-store' } });
}

function proxyMedia(response: Response): Response {
  const headers = new Headers();
  for (const name of ['cache-control', 'content-length', 'content-type', 'etag']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('content-security-policy', "default-src 'none'; sandbox");
  headers.set('x-content-type-options', 'nosniff');
  return new Response(response.body, { status: response.status, headers });
}

function forwardConditionalHeaders(headers: Headers): Headers {
  const forwarded = new Headers();
  const etag = headers.get('if-none-match');
  if (etag) forwarded.set('if-none-match', etag);
  return forwarded;
}

function libraryError(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Offline cache request failed';
  const status = message.includes('Invalid') ? 400 : message.includes('not configured') ? 503 : 502;
  return Response.json({ error: message }, { status });
}
