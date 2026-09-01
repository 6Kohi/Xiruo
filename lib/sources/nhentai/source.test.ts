import { describe, expect, it, vi } from 'vitest';

import type { SourceFetchResult } from '../../network/safe-fetch';
import type { SourceHttpClient } from '../../network/source-http-client';
import { NhentaiSource } from './source';

const context = { signal: new AbortController().signal, locale: 'zh-CN' };

function jsonResponse(data: unknown, status = 200): SourceFetchResult {
  return { url: 'https://nhentai.net/api/v2/fixture', status, headers: new Headers({ 'content-type': 'application/json' }), body: new TextEncoder().encode(JSON.stringify(data)) };
}

function requestMock(data: unknown, status = 200) {
  return vi.fn(async (_url: string, _options: Parameters<SourceHttpClient['request']>[1]) => jsonResponse(data, status));
}

describe('NhentaiSource', () => {
  it('maps search results and pagination from API fixtures', async () => {
    const request = requestMock({
      num_pages: 3,
      result: [{ id: 101, english_title: 'Fixture Gallery', thumbnail: 'galleries/101/cover.jpg', tag_ids: [29963], tags: [{ name: 'fixture-tag', type: 'tag' }], num_pages: 12 }],
    });
    const source = new NhentaiSource({ request });
    const result = await source.search('fixture', undefined, context);

    expect(request.mock.calls[0][0]).toContain('query=fixture');
    expect(result.nextCursor).toBe('2');
    expect(result.items[0]).toMatchObject({ id: '101', title: 'Fixture Gallery', sourceId: 'nhentai', kind: 'comic', subtitle: '12 页' });
    expect(result.items[0].tags).toEqual(['fixture-tag', '中文']);
    expect(result.items[0].coverUrl).toBe('https://t3.nhentai.net/galleries/101/cover.jpg');
  });

  it('maps gallery details and creator tags', async () => {
    const request = requestMock({
      id: 202,
      title: { pretty: 'Safe Fixture Detail', english: 'English Fixture' },
      cover: { path: 'galleries/202/cover.webp' },
      tags: [{ id: 1, name: 'Fixture Artist', type: 'artist' }],
      pages: [{ path: 'galleries/202/1.jpg' }, { path: 'galleries/202/2.png' }],
      num_pages: 2,
    });
    const source = new NhentaiSource({ request });
    const detail = await source.getDetails('nh202', context);

    expect(detail.title).toBe('Safe Fixture Detail');
    expect(detail.creators).toEqual(['Fixture Artist']);
    expect(detail.entries).toEqual([{ id: 'default', title: '全部页面', order: 1 }]);
  });

  it('maps chapter image paths', async () => {
    const request = requestMock({ id: 303, pages: [{ path: 'galleries/303/1.jpg' }, { path: '//i3.nhentai.net/galleries/303/2.webp' }] });
    const source = new NhentaiSource({ request });
    await expect(source.getChapter('nhentai303', 'default', context)).resolves.toEqual([
      'https://i3.nhentai.net/galleries/303/1.jpg',
      'https://i3.nhentai.net/galleries/303/2.webp',
    ]);
  });

  it('handles empty search, invalid ids, auth, rate limits, and invalid JSON', async () => {
    const request = requestMock({}, 401);
    const source = new NhentaiSource({ request });
    await expect(source.search('   ', undefined, context)).resolves.toEqual({ items: [] });
    await expect(source.getDetails('bad-id', context)).rejects.toThrow('Invalid');
    await expect(source.search('fixture', undefined, context)).rejects.toThrow('authentication');

    request.mockResolvedValueOnce(jsonResponse({}, 429));
    await expect(source.search('fixture', undefined, context)).rejects.toThrow('rate limit');

    request.mockResolvedValueOnce({ ...jsonResponse({}), body: new TextEncoder().encode('{') });
    await expect(source.search('fixture', undefined, context)).rejects.toThrow('invalid JSON');
  });
});
