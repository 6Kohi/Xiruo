import { afterEach, describe, expect, it, vi } from 'vitest';

import { SourceHttpClient } from './source-http-client';

afterEach(() => vi.unstubAllGlobals());

describe('SourceHttpClient', () => {
  it('captures and replays cookies only for the same source', async () => {
    const seenCookies: string[] = [];
    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const cookie = new Headers(init?.headers).get('cookie') ?? '';
      seenCookies.push(cookie);
      return new Response('ok', { headers: { 'set-cookie': 'session=private; Path=/; Secure; HttpOnly' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new SourceHttpClient();
    await client.request('https://nhentai.net/login', { sourceId: 'nhentai' });
    await client.request('https://nhentai.net/g/1', { sourceId: 'nhentai' });

    expect(seenCookies).toEqual(['', 'session=private']);
    expect(client.cookieJar.getCookieHeader('ehentai', 'https://nhentai.net/g/1')).toBe('');
  });

  it('applies cookies received during an allowed redirect', async () => {
    const fetchMock = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const cookie = new Headers(init?.headers).get('cookie');
      if (!cookie) return new Response(null, { status: 302, headers: { location: '/welcome', 'set-cookie': 'session=redirect; Path=/; Secure' } });
      expect(cookie).toBe('session=redirect');
      return new Response('welcome');
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new SourceHttpClient();
    const response = await client.request('https://nhentai.net/login', { sourceId: 'nhentai' });
    expect(new TextDecoder().decode(response.body)).toBe('welcome');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
