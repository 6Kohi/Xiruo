export async function GET(request: Request): Promise<Response> {
  const secret = process.env.XIRUO_PROXY_SECRET;
  if (!secret) return Response.json({ ok: false, error: 'Offline cache is not configured' }, { status: 503 });
  const cacheService = process.env.XIRUO_CACHE_SERVICE?.trim() || 'http://127.0.0.1:4011';
  try {
    const response = await fetch(new URL('/health', cacheService), {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(2_000)]),
      headers: { authorization: `Bearer ${secret}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: 'Offline cache service is unavailable' }, { status: 503 });
  }
}
