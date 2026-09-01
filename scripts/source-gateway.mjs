import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ProxyAgent, fetch } from 'undici';

const listenHost = '127.0.0.1';
const listenPort = Number(process.env.XIRUO_SOURCE_GATEWAY_PORT || 4010);
const secret = process.env.XIRUO_PROXY_SECRET;
const proxyUrl = process.env.XIRUO_OUTBOUND_PROXY?.trim();
if (!secret || secret.length < 32) throw new Error('XIRUO_PROXY_SECRET must contain at least 32 characters');

const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const allowedHosts = {
  nhentai: ['nhentai.net'],
  hanime1: ['hanime1.me', 'vdownload.hembed.com'],
  ehentai: ['e-hentai.org', 'exhentai.org', 'ehgt.org'],
  picacg: ['picaapi.picacomic.com', 'picacomic.com'],
};

createServer(async (request, response) => {
  try {
    if (request.method !== 'POST' || request.url !== '/fetch') return send(response, 404, 'Not found');
    if (!authorized(request.headers.authorization)) return send(response, 401, 'Unauthorized');
    const payload = JSON.parse(await readBody(request));
    const target = allowedTarget(payload.sourceId, payload.url);
    const connectController = new AbortController();
    const connectTimer = setTimeout(() => connectController.abort(new Error('Source connection timed out')), 30_000);
    let upstream;
    try {
      upstream = await fetch(target, {
        method: payload.method || 'GET',
        headers: payload.headers,
        body: payload.body,
        redirect: 'manual',
        dispatcher,
        signal: connectController.signal,
      });
    } finally {
      clearTimeout(connectTimer);
    }
    response.statusCode = upstream.status;
    for (const name of ['accept-ranges', 'content-range', 'content-type', 'content-length', 'location', 'cache-control']) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) response.setHeader('set-cookie', cookies);
    if (!upstream.body) return response.end();
    await pipeline(Readable.fromWeb(upstream.body), response);
  } catch (error) {
    if (response.headersSent) response.destroy(error instanceof Error ? error : undefined);
    else send(response, 502, error instanceof Error ? error.message : 'Gateway request failed');
  }
}).listen(listenPort, listenHost, () => {
  process.stdout.write(`Xiruo source gateway listening on http://${listenHost}:${listenPort}/fetch\n`);
});

function authorized(value) {
  const supplied = value?.startsWith('Bearer ') ? value.slice(7) : '';
  const left = Buffer.from(supplied);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

function allowedTarget(sourceId, rawUrl) {
  const target = new URL(rawUrl);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Invalid target URL');
  const hosts = allowedHosts[sourceId];
  if (!hosts?.some((host) => target.hostname === host || target.hostname.endsWith(`.${host}`))) throw new Error('Target host is not allowed');
  return target;
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error('Gateway request is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function send(response, status, message) {
  response.statusCode = status;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(message);
}
