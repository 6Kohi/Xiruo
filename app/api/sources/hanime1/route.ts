import { signProxyToken } from '@/lib/network/proxy-token';
import type { ContentDetails, ContentItem } from '@/lib/sources/contracts';
import { cachePlayback, getCachedPlayback } from '@/lib/sources/hanime1/playback-cache';
import { loadCachedSource, type SourceCacheStatus } from '@/lib/sources/hanime1/source-cache';
import { Hanime1Source } from '@/lib/sources/hanime1/source';

const source = new Hanime1Source();

export async function GET(request: Request): Promise<Response> {
  if (process.env.XIRUO_ENABLE_REAL_SOURCES !== 'true') return Response.json({ error: 'Real sources are disabled' }, { status: 503 });
  const proxySecret = process.env.XIRUO_PROXY_SECRET;
  if (!proxySecret) return Response.json({ error: 'Image proxy is not configured' }, { status: 503 });

  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? 'explore';
  // Let a shared source load finish even if the browser navigates away, so the
  // result can serve the next screen instead of immediately repeating upstream work.
  const context = { signal: new AbortController().signal, locale: 'zh-CN' };

  try {
    if (action === 'explore' || action === 'search') {
      const query = url.searchParams.get('q') ?? '';
      const cursor = url.searchParams.get('cursor') ?? undefined;
      const cacheKey = `${action}:${query.trim().toLocaleLowerCase()}:${cursor ?? '1'}`;
      const cached = await loadCachedSource(
        cacheKey,
        () => action === 'search' ? source.search(query, cursor, context) : source.explore(cursor, context),
        { freshForMs: action === 'search' ? 2 * 60_000 : 5 * 60_000, staleForMs: 60 * 60_000 },
      );
      return privateJson({ ...cached.value, items: await Promise.all(cached.value.items.map((item) => withProxyCover(item, proxySecret))) }, cached.status);
    }
    if (action === 'details') {
      const id = requiredId(url);
      const cached = await loadCachedSource(
        `details:${id}`,
        () => source.getDetails(id, context),
        { freshForMs: 10 * 60_000, staleForMs: 60 * 60_000 },
      );
      return privateJson(await withProxyCover(cached.value, proxySecret), cached.status);
    }
    if (action === 'playback') {
      const id = requiredId(url);
      const cached = getCachedPlayback(id);
      if (cached) return privateJson(await withProxyPlayback(cached, proxySecret), 'HIT');
      const playback = await source.resolvePlayback(id, context);
      cachePlayback(id, playback);
      return privateJson(await withProxyPlayback(playback, proxySecret), 'MISS');
    }
    return Response.json({ error: 'Unknown hanime1 action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'hanime1 request failed';
    const status = message.includes('rate limit') ? 429 : message.includes('Invalid') ? 400 : message.includes('source protection') ? 403 : 502;
    return Response.json({ error: message }, { status });
  }
}

function requiredId(url: URL): string {
  const id = url.searchParams.get('id');
  if (!id) throw new Error('Invalid hanime1 video id');
  return id;
}

async function withProxyCover<T extends ContentItem | ContentDetails>(item: T, secret: string): Promise<T> {
  if (!item.coverUrl) return item;
  const token = await signProxyToken({
    sourceId: 'hanime1',
    url: item.coverUrl,
    expiresAt: Date.now() + 5 * 60_000,
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      referer: 'https://hanime1.me/',
      'user-agent': 'Mozilla/5.0',
    },
  }, secret);
  return { ...item, coverUrl: `/api/image?token=${encodeURIComponent(token)}` };
}

function privateJson(data: unknown, cacheStatus?: SourceCacheStatus | 'HIT' | 'MISS'): Response {
  const headers = new Headers({ 'cache-control': 'private, no-store' });
  if (cacheStatus) headers.set('x-xiruo-source-cache', cacheStatus);
  return Response.json(data, { headers });
}

async function withProxyPlayback(playback: Awaited<ReturnType<Hanime1Source['resolvePlayback']>>, secret: string) {
  const token = await signProxyToken({
    sourceId: 'hanime1',
    url: playback.url,
    expiresAt: Date.now() + 2 * 60 * 60_000,
    headers: playback.headers,
  }, secret);
  return { ...playback, url: `/api/media?token=${encodeURIComponent(token)}` };
}
