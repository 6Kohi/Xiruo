import { describe, expect, it, vi } from 'vitest';

import type { SourceHttpClient } from '../../network/source-http-client';
import type { SourceFetchResult } from '../../network/safe-fetch';
import { Hanime1Source } from './source';

const context = { signal: new AbortController().signal, locale: 'zh-CN' };

function response(html: string, status = 200): SourceFetchResult {
  return { url: 'https://hanime1.me/fixture', status, headers: new Headers({ 'content-type': 'text/html' }), body: new TextEncoder().encode(html) };
}

function requestMock(html: string, status = 200) {
  return vi.fn(async (_url: string, _options: Parameters<SourceHttpClient['request']>[1]) => response(html, status));
}

describe('Hanime1Source', () => {
  it('parses and deduplicates list cards', async () => {
    const request = requestMock(`<article class="card"><a href="/watch?v=fixture-1" title="Fixture Video"><img data-src="/images/fixture.webp"></a><small>24:00</small></article><a href="/watch?v=fixture-1">duplicate</a><a href="?sort=最新上傳&amp;page=2">next</a>`);
    const source = new Hanime1Source({ request });
    const result = await source.explore(undefined, context);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: 'fixture-1', title: 'Fixture Video', coverUrl: 'https://hanime1.me/images/fixture.webp', kind: 'video' });
    expect(result.nextCursor).toBe('2');
    expect(request.mock.calls[0][0]).toBe('https://hanime1.me/search?sort=%E6%9C%80%E6%96%B0%E4%B8%8A%E5%82%B3&page=1');

    await source.explore('2', context);
    expect(request.mock.calls[1][0]).toContain('page=2');
  });

  it('encodes search terms and parses details', async () => {
    const request = requestMock(`<html><head><title>Safe Fixture</title><meta property="og:description" content="Fixture description"><meta property="og:image" content="/cover.jpg"></head><body><a href="/genre/test">测试标签</a><video poster="/other.jpg"></video></body></html>`);
    const source = new Hanime1Source({ request });
    const details = await source.getDetails('fixture-2', context);
    expect(request.mock.calls[0][0]).toContain('watch?v=fixture-2');
    expect(details).toMatchObject({ title: 'Safe Fixture', description: 'Fixture description', coverUrl: 'https://hanime1.me/cover.jpg', tags: ['测试标签'] });
  });

  it('forwards an optional browser session without hard-coding it', async () => {
    vi.stubEnv('XIRUO_HANIME1_COOKIE', 'cf_clearance=fixture-session');
    vi.stubEnv('XIRUO_HANIME1_USER_AGENT', 'Fixture Browser');
    const request = requestMock('<a href="/watch?v=fixture-session" title="Session Fixture"></a>');
    const source = new Hanime1Source({ request });

    await source.explore(undefined, context);

    const headers = new Headers(request.mock.calls[0][1].headers);
    expect(headers.get('cookie')).toBe('cf_clearance=fixture-session');
    expect(headers.get('user-agent')).toBe('Fixture Browser');
    vi.unstubAllEnvs();
  });

  it('resolves HLS and preserves the required referer', async () => {
    const source = new Hanime1Source({ request: requestMock(`<script>window.player = { file: "https:\\/\\/media.example.test\\/fixture.m3u8?token=abc" };</script>`) });
    await expect(source.resolvePlayback('fixture-3', context)).resolves.toEqual({ url: 'https://media.example.test/fixture.m3u8?token=abc', type: 'hls', headers: { referer: 'https://hanime1.me/' } });
  });

  it('rejects unsafe playback URLs and reports source protection', async () => {
    const unsafe = new Hanime1Source({ request: requestMock('<video src="http://127.0.0.1/private.mp4"></video>') });
    await expect(unsafe.resolvePlayback('fixture-4', context)).rejects.toThrow('not found');

    const blocked = new Hanime1Source({ request: requestMock('', 403) });
    await expect(blocked.explore(undefined, context)).rejects.toThrow('source protection');
  });
});
