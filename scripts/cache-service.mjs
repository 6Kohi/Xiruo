import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { ProxyAgent, fetch } from 'undici';

const listenHost = '127.0.0.1';
const listenPort = Number(process.env.XIRUO_CACHE_SERVICE_PORT || 4011);
const secret = process.env.XIRUO_PROXY_SECRET;
const dataRoot = path.resolve(process.env.XIRUO_DATA_DIR || './data');
const comicsRoot = path.join(dataRoot, 'comics');
const proxyUrl = process.env.XIRUO_OUTBOUND_PROXY?.trim();
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
const activeJobs = new Map();

if (!secret || secret.length < 32) throw new Error('XIRUO_PROXY_SECRET must contain at least 32 characters');
await mkdir(comicsRoot, { recursive: true });
await markInterruptedJobs();

createServer(async (request, response) => {
  try {
    if (!authorized(request.headers.authorization)) return sendJson(response, 401, { error: 'Unauthorized' });
    const url = new URL(request.url || '/', `http://${listenHost}:${listenPort}`);
    if (url.pathname === '/health' && request.method === 'GET') return sendJson(response, 200, { ok: true, dataRoot });
    if (url.pathname === '/comics' && request.method === 'GET') return sendJson(response, 200, { items: await listComics() });
    if (url.pathname === '/comics' && request.method === 'POST') return await saveComic(request, response);
    if (url.pathname === '/comics' && request.method === 'DELETE') return await deleteComic(url, response);
    if (url.pathname === '/comics/details' && request.method === 'GET') return await comicDetails(url, response);
    if (url.pathname === '/comics/chapter' && request.method === 'GET') return await comicChapter(url, response);
    if (url.pathname === '/comics/media' && request.method === 'GET') return await comicMedia(url, request, response);
    return sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    if (response.headersSent) response.destroy(error instanceof Error ? error : undefined);
    else sendJson(response, error instanceof CacheNotFoundError ? 404 : 500, { error: error instanceof Error ? error.message : 'Cache service failed' });
  }
}).listen(listenPort, listenHost, () => {
  process.stdout.write(`Xiruo cache service listening on http://${listenHost}:${listenPort}\n`);
  process.stdout.write(`Xiruo cache directory: ${dataRoot}\n`);
});

async function saveComic(request, response) {
  const payload = JSON.parse(await readBody(request));
  const sourceId = validateSource(payload.sourceId);
  const id = validateId(payload.id);
  if (!payload.item || !Array.isArray(payload.pages) || payload.pages.length === 0) return sendJson(response, 400, { error: 'Invalid comic cache payload' });
  const key = `${sourceId}:${id}`;
  if (activeJobs.has(key)) return sendJson(response, 202, await readManifest(sourceId, id));

  const directory = comicDirectory(sourceId, id);
  await mkdir(path.join(directory, 'pages'), { recursive: true });
  const manifest = {
    version: 1,
    sourceId,
    id,
    savedAt: Date.now(),
    status: 'downloading',
    completedPages: 0,
    totalPages: payload.pages.length,
    item: { ...payload.item, id, sourceId },
    cover: null,
    pages: Array(payload.pages.length).fill(null),
    error: '',
  };
  await writeManifest(directory, manifest);

  try {
    manifest.cover = await downloadAsset(payload.coverUrl, directory, 'cover', sourceId);
    await writeManifest(directory, manifest);
  } catch (error) {
    manifest.error = `封面缓存失败：${error instanceof Error ? error.message : 'unknown error'}`;
    await writeManifest(directory, manifest);
  }

  const job = cachePages(directory, manifest, payload.pages).finally(() => activeJobs.delete(key));
  activeJobs.set(key, job);
  return sendJson(response, 202, publicManifest(manifest));
}

async function cachePages(directory, manifest, urls) {
  try {
    for (let index = 0; index < urls.length; index += 1) {
      manifest.pages[index] = await downloadAsset(urls[index], path.join(directory, 'pages'), String(index + 1).padStart(4, '0'), manifest.sourceId);
      manifest.completedPages = index + 1;
      if (index === urls.length - 1 || (index + 1) % 3 === 0) await writeManifest(directory, manifest);
      await delay(180);
    }
    manifest.status = 'ready';
    manifest.error = '';
  } catch (error) {
    manifest.status = 'error';
    manifest.error = error instanceof Error ? error.message : '漫画缓存失败';
  }
  await writeManifest(directory, manifest);
}

async function deleteComic(url, response) {
  const sourceId = validateSource(url.searchParams.get('sourceId'));
  const id = validateId(url.searchParams.get('id'));
  const key = `${sourceId}:${id}`;
  if (activeJobs.has(key)) return sendJson(response, 409, { error: '漫画仍在缓存中，请稍后再取消收藏' });
  const directory = comicDirectory(sourceId, id);
  await rm(directory, { recursive: true, force: true });
  return sendJson(response, 200, { ok: true });
}

async function comicDetails(url, response) {
  const manifest = await requiredManifest(url);
  return sendJson(response, 200, { ...manifest.item, savedAt: manifest.savedAt, cacheStatus: manifest.status, cachedPages: manifest.completedPages, totalPages: manifest.totalPages });
}

async function comicChapter(url, response) {
  const manifest = await requiredManifest(url);
  if (manifest.status !== 'ready' || manifest.pages.some((page) => !page)) return sendJson(response, 409, { error: '漫画离线缓存尚未完成' });
  return sendJson(response, 200, { count: manifest.pages.length });
}

async function comicMedia(url, request, response) {
  const manifest = await requiredManifest(url);
  const kind = url.searchParams.get('kind');
  const asset = kind === 'cover' ? manifest.cover : manifest.pages[Number(url.searchParams.get('index')) - 1];
  if (!asset) return sendJson(response, 404, { error: 'Cached media not found' });
  const base = kind === 'cover' ? comicDirectory(manifest.sourceId, manifest.id) : path.join(comicDirectory(manifest.sourceId, manifest.id), 'pages');
  const filePath = safeChild(base, asset.file);
  const fileStat = await stat(filePath);
  response.statusCode = 200;
  response.setHeader('content-type', asset.contentType);
  response.setHeader('content-length', String(fileStat.size));
  response.setHeader('cache-control', 'private, max-age=31536000, immutable');
  response.setHeader('etag', `"${asset.sha256}"`);
  if (request.headers['if-none-match'] === `"${asset.sha256}"`) {
    response.statusCode = 304;
    return response.end();
  }
  await pipeline(createReadStream(filePath), response);
}

async function listComics() {
  const sourceDirectories = await readdir(comicsRoot, { withFileTypes: true }).catch(() => []);
  const manifests = [];
  for (const sourceDirectory of sourceDirectories.filter((entry) => entry.isDirectory())) {
    const comicDirectories = await readdir(path.join(comicsRoot, sourceDirectory.name), { withFileTypes: true }).catch(() => []);
    for (const comicDirectory of comicDirectories.filter((entry) => entry.isDirectory())) {
      const manifest = await readManifest(sourceDirectory.name, comicDirectory.name).catch(() => null);
      if (manifest) manifests.push(publicManifest(manifest));
    }
  }
  return manifests.sort((left, right) => right.savedAt - left.savedAt);
}

async function requiredManifest(url) {
  const sourceId = validateSource(url.searchParams.get('sourceId'));
  const id = validateId(url.searchParams.get('id'));
  return readManifest(sourceId, id);
}

async function readManifest(sourceId, id) {
  const contents = await readFile(path.join(comicDirectory(sourceId, id), 'manifest.json'), 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') throw new CacheNotFoundError();
    throw error;
  });
  return JSON.parse(contents);
}

async function writeManifest(directory, manifest) {
  const temporary = path.join(directory, 'manifest.json.tmp');
  await writeFile(temporary, JSON.stringify(manifest, null, 2));
  await rename(temporary, path.join(directory, 'manifest.json'));
}

async function downloadAsset(rawUrl, directory, stem, sourceId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('媒体下载超时')), 60_000);
  let response;
  try {
    let target = allowedMediaTarget(sourceId, rawUrl);
    for (let redirects = 0; redirects <= 4; redirects += 1) {
      response = await fetch(target, {
        headers: { referer: 'https://nhentai.net/', 'user-agent': 'Mozilla/5.0' },
        redirect: 'manual',
        dispatcher,
        signal: controller.signal,
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get('location');
      if (!location || redirects === 4) throw new Error('媒体重定向无效或次数过多');
      target = allowedMediaTarget(sourceId, new URL(location, target).toString());
    }
  } finally {
    clearTimeout(timer);
  }
  if (!response) throw new Error('媒体下载没有响应');
  if (!response.ok) throw new Error(`媒体下载失败（HTTP ${response.status}）`);
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || 'application/octet-stream';
  if (!contentType.startsWith('image/')) throw new Error('来源返回的不是图片');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 32 * 1024 * 1024) throw new Error('单张图片超过 32 MB');
  const extension = extensionFor(contentType);
  const file = `${stem}.${extension}`;
  const temporary = safeChild(directory, `${file}.tmp`);
  const destination = safeChild(directory, file);
  await writeFile(temporary, bytes);
  await rename(temporary, destination);
  return { file, contentType, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

async function markInterruptedJobs() {
  const sources = await readdir(comicsRoot, { withFileTypes: true }).catch(() => []);
  for (const source of sources.filter((entry) => entry.isDirectory())) {
    const comics = await readdir(path.join(comicsRoot, source.name), { withFileTypes: true }).catch(() => []);
    for (const comic of comics.filter((entry) => entry.isDirectory())) {
      const manifest = await readManifest(source.name, comic.name).catch(() => null);
      if (manifest?.status === 'downloading') {
        manifest.status = 'error';
        manifest.error = '缓存任务因服务重启而中断，请取消收藏后重新收藏';
        await writeManifest(comicDirectory(source.name, comic.name), manifest);
      }
    }
  }
}

function publicManifest(manifest) {
  return {
    ...manifest.item,
    savedAt: manifest.savedAt,
    cacheStatus: manifest.status,
    cachedPages: manifest.completedPages,
    totalPages: manifest.totalPages,
    cacheError: manifest.error || undefined,
    coverCached: Boolean(manifest.cover),
  };
}

function comicDirectory(sourceId, id) {
  return safeChild(safeChild(comicsRoot, sourceId), id);
}

function safeChild(parent, child) {
  const resolved = path.resolve(parent, child);
  if (resolved !== path.resolve(parent) && !resolved.startsWith(`${path.resolve(parent)}${path.sep}`)) throw new Error('Invalid cache path');
  return resolved;
}

function validateSource(value) {
  if (value !== 'nhentai') throw new Error('Unsupported comic source');
  return value;
}

function validateId(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('Invalid comic id');
  return value;
}

function allowedMediaTarget(sourceId, rawUrl) {
  if (sourceId !== 'nhentai') throw new Error('Unsupported comic source');
  const target = new URL(rawUrl);
  if (target.protocol !== 'https:' || target.username || target.password || !/(^|\.)nhentai\.net$/i.test(target.hostname)) throw new Error('Media host is not allowed');
  return target;
}

function extensionFor(contentType) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  return 'jpg';
}

function authorized(value) {
  const supplied = value?.startsWith('Bearer ') ? value.slice(7) : '';
  const left = Buffer.from(supplied);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) throw new Error('Cache request is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(response, status, data) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(data));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class CacheNotFoundError extends Error {
  constructor() {
    super('Cached comic not found');
  }
}
