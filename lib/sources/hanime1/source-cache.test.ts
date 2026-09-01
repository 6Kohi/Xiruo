import { describe, expect, it, vi } from 'vitest';

import { loadCachedSource } from './source-cache';

describe('hanime1 source cache', () => {
  it('reuses fresh data and coalesces matching requests', async () => {
    let resolveLoad!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((resolve) => { resolveLoad = resolve; }));
    const first = loadCachedSource('coalesced', load, { freshForMs: 1_000, staleForMs: 5_000 }, 100);
    const second = loadCachedSource('coalesced', load, { freshForMs: 1_000, staleForMs: 5_000 }, 100);
    resolveLoad('value');
    expect((await first).status).toBe('MISS');
    expect((await second).status).toBe('COALESCED');
    expect(load).toHaveBeenCalledTimes(1);
    expect((await loadCachedSource('coalesced', load, { freshForMs: 1_000, staleForMs: 5_000 }, 200)).status).toBe('HIT');
  });

  it('serves stale data when a refresh is blocked', async () => {
    await loadCachedSource('stale', async () => 'cached', { freshForMs: 100, staleForMs: 1_000 }, 100);
    const result = await loadCachedSource('stale', async () => { throw new Error('blocked'); }, { freshForMs: 100, staleForMs: 1_000 }, 250);
    expect(result).toEqual({ value: 'cached', status: 'STALE' });
  });
});
