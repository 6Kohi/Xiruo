import { describe, expect, it } from 'vitest';

import { buildVideoTagQuery } from './video-tags';

describe('video tag query', () => {
  it('deduplicates broad-match tags', () => {
    expect(buildVideoTagQuery(['中文字幕', 'ASMR', '中文字幕'], 'broad')).toBe('中文字幕 ASMR');
  });

  it('quotes every strict-match tag', () => {
    expect(buildVideoTagQuery(['中文字幕', '女教师'], 'strict')).toBe('"中文字幕" "女教师"');
  });
});
