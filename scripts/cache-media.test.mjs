import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { downloadMedia } from './cache-media.mjs';

const url = 'https://i.nhentai.net/galleries/123/1.jpg';
const image = () => new Response('image bytes', { headers: { 'content-type': 'image/jpeg' } });

test('cache downloads use the authenticated gateway without forwarding the secret upstream', async () => {
  const calls = [];
  const result = await downloadMedia(url, 'nhentai', {
    gateway: 'http://127.0.0.1:4010/fetch', secret: 'test-secret', dispatcher: {},
    fetch: async (target, init) => { calls.push({ target: String(target), init }); return image(); },
  });
  assert.equal(result.bytes.toString(), 'image bytes');
  assert.equal(calls[0].target, 'http://127.0.0.1:4010/fetch');
  assert.equal(calls[0].init.headers.authorization, 'Bearer test-secret');
  assert.equal(calls[0].init.redirect, 'manual');
  assert.equal(calls[0].init.dispatcher, undefined);
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.url, url);
  assert.equal(payload.sourceId, 'nhentai');
  assert.equal(payload.headers.authorization, undefined);
});

test('standalone cache retains its configured outbound dispatcher', async () => {
  const dispatcher = {};
  await downloadMedia(url, 'nhentai', { dispatcher, fetch: async (target, init) => {
    assert.equal(String(target), url);
    assert.equal(init.dispatcher, dispatcher);
    assert.equal(init.headers.authorization, undefined);
    return image();
  } });
});

test('rejects an external gateway before transmitting its secret', async () => {
  await assert.rejects(downloadMedia(url, 'nhentai', {
    gateway: 'http://example.com/fetch', secret: 'secret',
    fetch: () => assert.fail('must not fetch'),
  }), /local HTTP/);
});

test('redirects are revalidated and their bodies canceled', async () => {
  let canceled = false;
  let calls = 0;
  await assert.rejects(downloadMedia(url, 'nhentai', { fetch: async () => {
    calls++;
    return new Response(new ReadableStream({ cancel() { canceled = true; } }), {
      status: 302, headers: { location: 'https://example.com/private' },
    });
  } }), /Media host/);
  assert.equal(calls, 1);
  assert.equal(canceled, true);
});

test('valid redirected media still goes through the gateway', async () => {
  const targets = [];
  await downloadMedia(url, 'nhentai', {
    gateway: 'http://localhost:4010/fetch', secret: 'test',
    fetch: async (target, init) => {
      assert.equal(String(target), 'http://localhost:4010/fetch');
      targets.push(JSON.parse(init.body).url);
      return targets.length === 1 ? new Response(null, { status: 302, headers: { location: '/galleries/123/2.jpg' } }) : image();
    },
  });
  assert.deepEqual(targets, [url, 'https://i.nhentai.net/galleries/123/2.jpg']);
});

test('rejects non-images and oversized advertised bodies without reading them', async () => {
  for (const headers of [{ 'content-type': 'text/html' }, { 'content-type': 'image/jpeg', 'content-length': '33' }]) {
    let canceled = false;
    await assert.rejects(downloadMedia(url, 'nhentai', { maximumBytes: 32, fetch: async () =>
      new Response(new ReadableStream({ cancel() { canceled = true; } }), { headers }),
    }));
    assert.equal(canceled, true);
  }
});

test('bounds streamed bodies even without a Content-Length header', async () => {
  let canceled = false;
  await assert.rejects(downloadMedia(url, 'nhentai', { maximumBytes: 3, fetch: async () =>
    new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(4)); },
      cancel() { canceled = true; },
    }), { headers: { 'content-type': 'image/png' } }),
  }), /32 MB/);
  assert.equal(canceled, true);
});

test('timeout aborts a body that stalls after successful headers', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'image/jpeg' });
    response.write('partial');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await assert.rejects(downloadMedia(url, 'nhentai', {
      fetch, timeout: 100, gateway: `http://127.0.0.1:${server.address().port}/fetch`, secret: 'test',
    }), /超时|abort/i);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
