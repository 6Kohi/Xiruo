import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { chromium } from 'playwright-core';
import { ProxyAgent, fetch } from 'undici';

const listenHost = '127.0.0.1';
const listenPort = Number(process.env.XIRUO_SOURCE_GATEWAY_PORT || 4010);
const secret = process.env.XIRUO_PROXY_SECRET;
const dataDirectory = process.env.XIRUO_DATA_DIR?.trim() || '/data';
const settingsPath = path.join(dataDirectory, 'runtime-settings.json');
const browserProfilePath = path.join(dataDirectory, 'browser', 'hanime1');
if (!secret || secret.length < 32) throw new Error('XIRUO_PROXY_SECRET must contain at least 32 characters');

const allowedHosts = {
  nhentai: ['nhentai.net'],
  hanime1: ['hanime1.me', 'vdownload.hembed.com'],
  ehentai: ['e-hentai.org', 'exhentai.org', 'ehgt.org'],
  picacg: ['picaapi.picacomic.com', 'picacomic.com'],
};

let settings = await loadSettings();
let dispatcherEntry;
let browserContext;
let browserLaunchPromise;
let browserStatus = 'idle';
let browserLastError = '';
let browserLastUpdatedAt = '';

const server = createServer(async (request, response) => {
  try {
    if (!authorized(request.headers.authorization)) return send(response, 401, 'Unauthorized');

    if (request.url === '/settings' && request.method === 'GET') return sendJson(response, 200, publicSettings());
    if (request.url === '/settings' && request.method === 'PUT') {
      const next = validateSettings(JSON.parse(await readBody(request, 32 * 1024)));
      await persistSettings(next);
      settings = next;
      await resetNetworkClients();
      return sendJson(response, 200, publicSettings());
    }
    if (request.url === '/hanime1/session' && request.method === 'POST') {
      await resetBrowser();
      const html = await fetchWithBrowser(new URL('https://hanime1.me/'));
      return sendJson(response, 200, { ...publicSettings(), ready: html.length > 0 });
    }
    if (request.method !== 'POST' || request.url !== '/fetch') return send(response, 404, 'Not found');

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
        dispatcher: getDispatcher(),
        signal: connectController.signal,
      });
    } finally {
      clearTimeout(connectTimer);
    }

    if (shouldUseBrowser(payload, target, upstream)) {
      await upstream.body?.cancel();
      const html = await fetchWithBrowser(target);
      response.statusCode = 200;
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.setHeader('cache-control', 'no-store');
      return response.end(html);
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
});

server.listen(listenPort, listenHost, () => {
  process.stdout.write(`Xiruo source gateway listening on http://${listenHost}:${listenPort}/fetch\n`);
});

async function loadSettings() {
  try {
    return validateSettings(JSON.parse(await readFile(settingsPath, 'utf8')));
  } catch (error) {
    if (error?.code !== 'ENOENT') process.stderr.write(`Ignoring invalid runtime settings: ${error instanceof Error ? error.message : String(error)}\n`);
    return settingsFromEnvironment();
  }
}

function settingsFromEnvironment() {
  const raw = process.env.XIRUO_OUTBOUND_PROXY?.trim();
  if (!raw) return { proxyHost: '', proxyPort: '' };
  try {
    const url = new URL(raw);
    return validateSettings({ proxyHost: url.hostname, proxyPort: url.port || (url.protocol === 'https:' ? '443' : '80') });
  } catch {
    return { proxyHost: '', proxyPort: '' };
  }
}

function validateSettings(input) {
  const proxyHost = String(input?.proxyHost ?? '').trim();
  const proxyPort = String(input?.proxyPort ?? '').trim();
  if (!proxyHost && !proxyPort) return { proxyHost: '', proxyPort: '' };
  if (isIP(proxyHost) !== 4) throw new Error('代理 IP 必须是有效的 IPv4 地址');
  const port = Number(proxyPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('代理端口必须在 1 到 65535 之间');
  return { proxyHost, proxyPort: String(port) };
}

async function persistSettings(next) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryPath = `${settingsPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryPath, settingsPath);
}

function publicSettings() {
  return { ...settings, proxyEnabled: Boolean(proxyUrl()), browserStatus, browserLastError, browserLastUpdatedAt };
}

function proxyUrl() {
  return settings.proxyHost ? `http://${settings.proxyHost}:${settings.proxyPort}` : '';
}

function getDispatcher() {
  const url = proxyUrl();
  if (!url) return undefined;
  if (dispatcherEntry?.url !== url) {
    void dispatcherEntry?.dispatcher.close();
    dispatcherEntry = { url, dispatcher: new ProxyAgent(url) };
  }
  return dispatcherEntry.dispatcher;
}

async function resetNetworkClients() {
  if (dispatcherEntry) await dispatcherEntry.dispatcher.close();
  dispatcherEntry = undefined;
  await resetBrowser();
}

async function resetBrowser() {
  const current = browserContext;
  browserContext = undefined;
  browserLaunchPromise = undefined;
  browserStatus = 'idle';
  browserLastError = '';
  browserLastUpdatedAt = new Date().toISOString();
  if (current) await current.close().catch(() => undefined);
}

function shouldUseBrowser(payload, target, upstream) {
  if (payload.sourceId !== 'hanime1' || (payload.method && payload.method !== 'GET')) return false;
  if (target.hostname !== 'hanime1.me' && !target.hostname.endsWith('.hanime1.me')) return false;
  return upstream.status === 403 && String(payload.headers?.accept ?? '').includes('text/html');
}

async function fetchWithBrowser(target) {
  const context = await getBrowserContext();
  browserStatus = 'acquiring';
  browserLastError = '';
  browserLastUpdatedAt = new Date().toISOString();
  const page = await context.newPage();
  try {
    const navigation = await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(4_000);
    const html = await page.content();
    const title = await page.title();
    if ((navigation?.status() ?? 200) >= 400 || /just a moment|cf-chl|captcha|challenge-platform/i.test(`${title}\n${html}`)) {
      throw new Error('hanime1 自动会话获取未通过来源验证，请确认代理节点可访问该站点后重试');
    }
    browserStatus = 'ready';
    browserLastUpdatedAt = new Date().toISOString();
    return html;
  } catch (error) {
    browserStatus = 'error';
    browserLastError = error instanceof Error ? error.message : 'hanime1 自动会话获取失败';
    browserLastUpdatedAt = new Date().toISOString();
    throw error;
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function getBrowserContext() {
  if (browserContext) return browserContext;
  if (!browserLaunchPromise) {
    browserLaunchPromise = (async () => {
      await mkdir(browserProfilePath, { recursive: true });
      const proxy = proxyUrl();
      const context = await chromium.launchPersistentContext(browserProfilePath, {
        executablePath: process.env.XIRUO_CHROMIUM_PATH?.trim() || '/usr/bin/chromium',
        headless: true,
        locale: 'zh-CN',
        proxy: proxy ? { server: proxy } : undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
      browserContext = context;
      context.once('close', () => { if (browserContext === context) browserContext = undefined; });
      return context;
    })().finally(() => { browserLaunchPromise = undefined; });
  }
  return browserLaunchPromise;
}

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

async function readBody(request, maximumSize = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumSize) throw new Error('Gateway request is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function send(response, status, message) {
  response.statusCode = status;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(message);
}

function sendJson(response, status, value) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(value));
}

async function shutdown() {
  server.close();
  await browserContext?.close().catch(() => undefined);
  await dispatcherEntry?.dispatcher.close().catch(() => undefined);
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
