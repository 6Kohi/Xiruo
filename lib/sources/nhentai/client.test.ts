import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadNhentaiChapter, loadNhentaiDetails, loadNhentaiItems } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('nhentai client', () => {
  it('selects explore and search actions', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await loadNhentaiItems('');
    await loadNhentaiItems('fixture term', '2');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/sources/nhentai?action=explore');
    expect(fetchMock.mock.calls[1][0]).toContain('action=search&q=fixture+term&cursor=2');
  });

  it('loads details and chapter images', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: '42', title: 'Fixture' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ images: ['/api/image?token=a'] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadNhentaiDetails('42')).resolves.toMatchObject({ id: '42' });
    await expect(loadNhentaiChapter('42')).resolves.toEqual(['/api/image?token=a']);
  });

  it('surfaces API error messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Source unavailable' }), { status: 502 })));
    await expect(loadNhentaiItems('')).rejects.toThrow('Source unavailable');
  });
});
