import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

test('favorite caches through gateway and serves offline details and pages', { timeout: 10_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'xiruo-cache-test-'));
  const secret = 'test-secret-with-at-least-32-characters';
  const requests = [];
  const gateway = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    requests.push({ authorization: request.headers.authorization, payload: JSON.parse(body) });
    response.writeHead(200, { 'content-type': 'image/png' });
    response.end('fixture-image');
  });
  gateway.listen(0, '127.0.0.1');
  await once(gateway, 'listening');
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ['scripts/cache-service.mjs'], {
    env: { ...process.env, XIRUO_PROXY_SECRET: secret, XIRUO_DATA_DIR: directory,
      XIRUO_CACHE_SERVICE_PORT: String(port), XIRUO_SOURCE_GATEWAY: `http://127.0.0.1:${gateway.address().port}/fetch`,
      XIRUO_OUTBOUND_PROXY: '',
    }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const request = (pathname, init = {}) => fetch(`http://127.0.0.1:${port}${pathname}`, {
    ...init, headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
  });
  try {
    for (let attempt = 0; !output.includes('listening') && attempt < 100; attempt++) {
      if (child.exitCode !== null) assert.fail(output);
      await delay(25);
    }
    assert.match(output, /listening/);
    const saved = await request('/comics', { method: 'POST', body: JSON.stringify({
      sourceId: 'nhentai', id: '123', item: { id: '123', title: 'Fixture', kind: 'comic', coverUrl: 'https://t.nhentai.net/cover.png' },
      coverUrl: 'https://t.nhentai.net/cover.png', pages: ['https://i.nhentai.net/1.png'],
    }) });
    assert.equal(saved.status, 202);
    assert.equal((await saved.json()).coverCached, true);
    let item;
    for (let attempt = 0; attempt < 100; attempt++) {
      item = (await (await request('/comics')).json()).items[0];
      if (item.cacheStatus !== 'downloading') break;
      await delay(25);
    }
    assert.equal(item.cacheStatus, 'ready', item.cacheError);
    assert.equal(item.cachedPages, 1);
    assert.equal(requests.length, 2);
    assert.ok(requests.every((entry) => entry.authorization === `Bearer ${secret}`));
    assert.deepEqual(requests.map((entry) => entry.payload.url), ['https://t.nhentai.net/cover.png', 'https://i.nhentai.net/1.png']);
    // All remaining requests are disk-only, even after the gateway is stopped.
    await new Promise((resolve) => gateway.close(resolve));
    const details = await (await request('/comics/details?sourceId=nhentai&id=123')).json();
    assert.equal(details.coverCached, true);
    const media = await request('/comics/media?sourceId=nhentai&id=123&kind=page&index=1');
    assert.equal(await media.text(), 'fixture-image');
    assert.equal(await readFile(path.join(directory, 'comics/nhentai/123/pages/0001.png'), 'utf8'), 'fixture-image');
  } finally {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    if (child.exitCode === null) await exited;
    gateway.closeAllConnections();
    if (gateway.listening) await new Promise((resolve) => gateway.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
