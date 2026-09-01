import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchSource } from './safe-fetch';

afterEach(() => vi.unstubAllGlobals());

describe('fetchSource', () => {
  it('returns a bounded response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200, headers: { 'content-length': '2' } })));
    const result = await fetchSource('https://nhentai.net/api/test', { sourceId: 'nhentai' });
    expect(result.status).toBe(200);
    expect(new TextDecoder().decode(result.body)).toBe('ok');
  });

  it('validates every redirect target', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } })));
    await expect(fetchSource('https://nhentai.net/start', { sourceId: 'nhentai' })).rejects.toThrow('blocked');
  });

  it('rejects declared and actual oversized responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('oversized', { headers: { 'content-length': '100' } })));
    await expect(fetchSource('https://nhentai.net/file', { sourceId: 'nhentai', maxBytes: 5 })).rejects.toThrow('size limit');
  });

  it('strips forwarding and hop-by-hop headers', async () => {
    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.has('host')).toBe(false);
      expect(headers.has('x-forwarded-for')).toBe(false);
      expect(headers.get('referer')).toBe('https://nhentai.net/');
      return new Response('ok');
    });
    vi.stubGlobal('fetch', fetchMock);
    await fetchSource('https://nhentai.net/file', { sourceId: 'nhentai', headers: { host: 'internal', 'x-forwarded-for': '127.0.0.1', referer: 'https://nhentai.net/' } });
  });
});
