import { describe, expect, it } from 'vitest';

import type { ContentItem } from '../sources/contracts';
import { availableTags, buildLibraryView, itemMetric } from './library-view';

const items: ContentItem[] = [
  { id: '1', sourceId: 'nhentai', sourceName: 'nhentai', kind: 'comic', title: 'Zulu', subtitle: '12 页', coverUrl: '', tags: ['中文', 'full color'], progress: 0, progressLabel: '' },
  { id: '2', sourceId: 'nhentai', sourceName: 'nhentai', kind: 'comic', title: 'Alpha', subtitle: '72 页', coverUrl: '', tags: ['English', 'full color'], progress: 0, progressLabel: '' },
  { id: '3', sourceId: 'nhentai', sourceName: 'nhentai', kind: 'comic', title: 'Beta', subtitle: '35 页', coverUrl: '', tags: ['中文', 'artist cg'], progress: 0, progressLabel: '' },
];

describe('library view', () => {
  it('filters by length, language, and tag', () => {
    expect(buildLibraryView(items, { kind: 'comic', sort: 'recent', length: 'short', language: '中文', tag: 'full color' }).map((item) => item.id)).toEqual(['1']);
  });

  it('sorts without mutating source order', () => {
    expect(buildLibraryView(items, { kind: 'comic', sort: 'longest', length: 'all', language: 'all', tag: 'all' }).map((item) => item.id)).toEqual(['2', '3', '1']);
    expect(items.map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('parses comic pages and video durations', () => {
    expect(itemMetric(items[0])).toBe(12);
    expect(itemMetric({ ...items[0], kind: 'video', subtitle: '01:25:30' })).toBeCloseTo(85.5);
  });

  it('ranks common tags and removes language tags', () => {
    expect(availableTags(items)).toEqual(['full color', 'artist cg']);
  });
});
