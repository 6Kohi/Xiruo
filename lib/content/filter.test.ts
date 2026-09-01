import { describe, expect, it } from 'vitest';

import type { ContentItem } from '../sources/contracts';
import { filterContent } from './filter';

const testItems: ContentItem[] = [
  { id: 'comic-aurora-1', sourceId: 'fixture-comic', sourceName: '测试来源', kind: 'comic', title: '霓虹书架', subtitle: '第 18 话 · 城市边缘', coverUrl: '/cover-1.jpg', tags: ['科幻', '连载'], progress: 64, progressLabel: '18 / 28' },
  { id: 'video-reel-1', sourceId: 'fixture-video', sourceName: '测试来源', kind: 'video', title: '紫光放映室', subtitle: '24 分钟 · 单集', coverUrl: '/cover-2.jpg', tags: ['动画', '短片'], progress: 31, progressLabel: '07:26' },
  { id: 'video-frame-3', sourceId: 'fixture-video', sourceName: '测试来源', kind: 'video', title: '最后一帧', subtitle: '48 分钟 · 特别篇', coverUrl: '/cover-3.jpg', tags: ['动画', '特别篇'], progress: 88, progressLabel: '42:14' },
];

describe('filterContent', () => {
  it('returns every item for an empty all filter', () => {
    expect(filterContent(testItems, 'all', '')).toHaveLength(testItems.length);
  });

  it('separates comics and videos', () => {
    expect(filterContent(testItems, 'comic', '').every((item) => item.kind === 'comic')).toBe(true);
    expect(filterContent(testItems, 'video', '').every((item) => item.kind === 'video')).toBe(true);
  });

  it('searches titles, subtitles, sources, and tags', () => {
    expect(filterContent(testItems, 'all', '科幻').map((item) => item.id)).toEqual(['comic-aurora-1']);
    expect(filterContent(testItems, 'all', '特别篇').map((item) => item.id)).toEqual(['video-frame-3']);
  });

  it('combines query and type filters', () => {
    expect(filterContent(testItems, 'comic', '动画')).toEqual([]);
  });
});
