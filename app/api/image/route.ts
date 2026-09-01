import { fetchSourceStream } from '@/lib/network/safe-fetch';
import { verifyProxyToken } from '@/lib/network/proxy-token';

const forwardedResponseHeaders = ['accept-ranges', 'content-length', 'content-range', 'content-type', 'etag', 'last-modified'];

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.XIRUO_PROXY_SECRET;
  if (!secret) return Response.json({ error: 'Image proxy is not configured' }, { status: 503 });

  const token = new URL(request.url).searchParams.get('token');
  if (!token) return Response.json({ error: 'Missing image proxy token' }, { status: 400 });

  try {
    const payload = await verifyProxyToken(token, secret);
    const requestHeaders = new Headers(payload.headers);
    const range = request.headers.get('range');
    if (range) requestHeaders.set('range', range);

    const upstream = await fetchSourceStream(payload.url, {
      sourceId: payload.sourceId,
      headers: requestHeaders,
      maxBytes: 32 * 1024 * 1024,
      timeoutMs: 15_000,
    });

    const contentType = upstream.headers.get('content-type')?.toLocaleLowerCase() ?? '';
    if (!contentType.startsWith('image/')) {
      await upstream.body?.cancel();
      return Response.json({ error: 'Upstream response is not an image' }, { status: 415 });
    }

    const headers = new Headers({
      'cache-control': 'private, max-age=300',
      'content-security-policy': "default-src 'none'; sandbox",
      'x-content-type-options': 'nosniff',
    });
    for (const name of forwardedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image proxy request failed';
    const status = message.includes('expired') || message.includes('token') ? 401 : 400;
    return Response.json({ error: message }, { status });
  }
}
