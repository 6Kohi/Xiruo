import { expect, it } from 'vitest';

import { NhentaiSource } from './source';

it.skipIf(process.env.XIRUO_NHENTAI_SMOKE !== 'true')('loads nhentai public metadata when explicitly enabled', async () => {
  const source = new NhentaiSource();
  const result = await source.explore(undefined, { signal: AbortSignal.timeout(15_000), locale: 'zh-CN' });
  expect(result.items.length).toBeGreaterThan(0);
  expect(result.items.every((item) => item.sourceId === 'nhentai')).toBe(true);
}, 20_000);
