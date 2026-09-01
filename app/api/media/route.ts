import { fetchSourceStream } from '@/lib/network/safe-fetch';
import { verifyProxyToken } from '@/lib/network/proxy-token';

const forwardedResponseHeaders = ['accept-ranges', 'content-length', 'content-range', 'content-type'];

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.XIRUO_PROXY_SECRET;
  if (!secret) return Response.json({ error: 'Media proxy is not configured' }, { status: 503 });

  const token = new URL(request.url).searchParams.get('token');
  if (!token) return Response.json({ error: 'Missing media proxy token' }, { status: 400 });

  try {
    const payload = await verifyProxyToken(token, secret);
    if (payload.sourceId !== 'hanime1') return Response.json({ error: 'Media proxy source is not allowed' }, { status: 403 });

    const requestHeaders = new Headers(payload.headers);
    const range = request.headers.get('range');
    if (range) requestHeaders.set('range', range);
    const upstream = await fetchSourceStream(payload.url, {
      sourceId: payload.sourceId,
      headers: requestHeaders,
      // This route streams bytes and never buffers the full file in memory.
      // Keep a generous hard ceiling while allowing normal long-form videos.
      maxBytes: 4 * 1024 * 1024 * 1024,
      timeoutMs: 30_000,
    });
    const contentType = upstream.headers.get('content-type')?.toLocaleLowerCase() ?? '';
    if (!contentType.startsWith('video/') && !contentType.includes('dash+xml')) {
      await upstream.body?.cancel();
      return Response.json({ error: 'Upstream response is not playable media' }, { status: 415 });
    }

    const headers = new Headers({
      'cache-control': 'private, no-store',
      'cross-origin-resource-policy': 'same-origin',
      'x-content-type-options': 'nosniff',
    });
    for (const name of forwardedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Media proxy request failed';
    const status = message.includes('expired') || message.includes('token') ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
