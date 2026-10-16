// Both browsing and offline downloads must use the gateway's live proxy settings.
export async function downloadMedia(rawUrl, sourceId, {
  fetch, dispatcher, gateway, secret, timeout = 60_000, maximumBytes = 32 * 1024 * 1024,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('媒体下载超时')), timeout);
  let response;
  try {
    let target = allowedMediaTarget(sourceId, rawUrl);
    const gatewayUrl = gateway ? localGateway(gateway) : undefined;
    for (let redirects = 0; redirects <= 4; redirects += 1) {
      const headers = { referer: 'https://nhentai.net/', 'user-agent': 'Mozilla/5.0' };
      response = await fetch(gatewayUrl || target, gatewayUrl ? {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId, url: target.toString(), method: 'GET', headers }),
        redirect: 'manual',
        signal: controller.signal,
      } : { headers, redirect: 'manual', dispatcher, signal: controller.signal });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects === 4) throw new Error('媒体重定向无效或次数过多');
      target = allowedMediaTarget(sourceId, new URL(location, target).toString());
    }
    if (!response?.ok) throw new Error(`媒体下载失败（HTTP ${response?.status}）`);
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || 'application/octet-stream';
    if (!contentType.startsWith('image/')) throw new Error('来源返回的不是图片');
    if (Number(response.headers.get('content-length')) > maximumBytes) throw new Error('单张图片超过 32 MB');
    // Keep the timeout active until the body is consumed, and bound memory while reading.
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body || []) {
      size += chunk.length;
      if (size > maximumBytes) throw new Error('单张图片超过 32 MB');
      chunks.push(Buffer.from(chunk));
    }
    return { bytes: Buffer.concat(chunks), contentType };
  } finally {
    clearTimeout(timer);
    if (response?.body && !response.body.locked) await response.body.cancel().catch(() => undefined);
  }
}

function localGateway(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.username || url.password) {
    throw new Error('Source gateway must use local HTTP');
  }
  return url;
}

function allowedMediaTarget(sourceId, rawUrl) {
  if (sourceId !== 'nhentai') throw new Error('Unsupported comic source');
  const target = new URL(rawUrl);
  if (target.protocol !== 'https:' || target.username || target.password || !/(^|\.)nhentai\.net$/i.test(target.hostname)) throw new Error('Media host is not allowed');
  return target;
}
