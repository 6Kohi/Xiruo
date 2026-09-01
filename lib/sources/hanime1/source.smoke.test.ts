import { expect, it } from 'vitest';

import { Hanime1Source } from './source';

it.skipIf(process.env.XIRUO_HANIME1_SMOKE !== 'true')('loads public hanime1 metadata when explicitly enabled', async () => {
  const source = new Hanime1Source();
  const result = await source.explore(undefined, { signal: AbortSignal.timeout(20_000), locale: 'zh-CN' });
  expect(result.items.length).toBeGreaterThan(0);
  expect(result.items.every((item) => item.sourceId === 'hanime1')).toBe(true);
});
