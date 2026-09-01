const gatewayTimeout = 60_000;

export async function GET(request: Request): Promise<Response> {
  return forwardToGateway(request, '/settings', 'GET');
}

export async function PUT(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return Response.json({ error: 'Cross-origin settings update is not allowed' }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '设置内容不是有效的 JSON' }, { status: 400 });
  }
  return forwardToGateway(request, '/settings', 'PUT', JSON.stringify(body));
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return Response.json({ error: 'Cross-origin session update is not allowed' }, { status: 403 });
  return forwardToGateway(request, '/hanime1/session', 'POST');
}

async function forwardToGateway(request: Request, pathname: string, method: string, body?: string): Promise<Response> {
  const secret = process.env.XIRUO_PROXY_SECRET;
  const gateway = process.env.XIRUO_SOURCE_GATEWAY?.trim();
  if (!secret || !gateway) return Response.json({ error: '本地来源网关尚未配置' }, { status: 503 });

  try {
    const target = new URL(pathname, gateway);
    if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname)) throw new Error('Invalid local gateway');
    const response = await fetch(target, {
      method,
      body,
      headers: { authorization: `Bearer ${secret}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(gatewayTimeout)]),
    });
    const text = await response.text();
    if (!response.ok) return Response.json({ error: text || `HTTP ${response.status}` }, { status: response.status });
    return new Response(text, { status: response.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '设置服务暂时不可用' }, { status: 502 });
  }
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
