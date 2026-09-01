import { signProxyToken } from '@/lib/network/proxy-token';
import type { ContentDetails, ContentItem } from '@/lib/sources/contracts';
import { NhentaiSource } from '@/lib/sources/nhentai/source';

const source = new NhentaiSource();

export async function GET(request: Request): Promise<Response> {
  if (process.env.XIRUO_ENABLE_REAL_SOURCES !== 'true') {
    return Response.json({ error: 'Real sources are disabled' }, { status: 503 });
  }
  const proxySecret = process.env.XIRUO_PROXY_SECRET;
  if (!proxySecret) return Response.json({ error: 'Image proxy is not configured' }, { status: 503 });

  const url = new URL(request.url);
  const action = url.searchParams.get('action') ?? 'explore';
  const context = { signal: request.signal, locale: 'zh-CN' };

  try {
    if (action === 'search') {
      const result = await source.search(url.searchParams.get('q') ?? '', url.searchParams.get('cursor') ?? undefined, context);
      return privateJson({ ...result, items: await Promise.all(result.items.map((item) => withProxyCover(item, proxySecret))) });
    }
    if (action === 'explore') {
      const result = await source.explore(url.searchParams.get('cursor') ?? undefined, context);
      return privateJson({ ...result, items: await Promise.all(result.items.map((item) => withProxyCover(item, proxySecret))) });
    }
    if (action === 'details') {
      const details = await source.getDetails(requiredId(url), context);
      return privateJson(await withProxyCover(details, proxySecret));
    }
    if (action === 'chapter') {
      const images = await source.getChapter(requiredId(url), 'default', context);
      return privateJson({
        images: await Promise.all(images.map((imageUrl) => createProxyUrl(imageUrl, proxySecret, 2 * 60 * 60_000))),
      });
    }
    return Response.json({ error: 'Unknown nhentai action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'nhentai request failed';
    const status = message.includes('rate limit') ? 429 : message.includes('authentication') ? 401 : message.includes('Invalid') ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}

function requiredId(url: URL): string {
  const id = url.searchParams.get('id');
  if (!id) throw new Error('Invalid nhentai gallery id');
  return id;
}

async function withProxyCover<T extends ContentItem | ContentDetails>(item: T, secret: string): Promise<T> {
  if (!item.coverUrl) return item;
  return { ...item, coverUrl: await createProxyUrl(item.coverUrl, secret, 5 * 60_000) };
}

async function createProxyUrl(imageUrl: string, secret: string, lifetimeMs: number): Promise<string> {
  const token = await signProxyToken({
    sourceId: 'nhentai',
    url: imageUrl,
    expiresAt: Date.now() + lifetimeMs,
    headers: { referer: 'https://nhentai.net/', 'user-agent': 'Mozilla/5.0' },
  }, secret);
  return `/api/image?token=${encodeURIComponent(token)}`;
}

function privateJson(data: unknown): Response {
  return Response.json(data, { headers: { 'cache-control': 'private, no-store' } });
}
