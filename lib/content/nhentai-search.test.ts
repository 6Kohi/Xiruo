import { describe, expect, it } from 'vitest';

import { activeNhentaiCatalogToken, appendNhentaiOperator, applyNhentaiSuggestion, nhentaiSearchOperators, searchNhentaiSuggestions } from './nhentai-search';

describe('nhentai search helpers', () => {
  it('exposes the source search operators', () => {
    expect(nhentaiSearchOperators.map((item) => item.key)).toContain('jtitle');
  });

  it('finds catalog suggestions for the active token', () => {
    expect(searchNhentaiSuggestions('language:"chinese" tag:big')[0]?.name).toBe('big breasts');
    expect(activeNhentaiCatalogToken('artist:cri')?.type).toBe('artist');
  });

  it('builds and replaces source query tokens', () => {
    expect(appendNhentaiOperator('language:"chinese"', nhentaiSearchOperators[0])).toBe('language:"chinese" tag:');
    expect(applyNhentaiSuggestion('language:"chinese" tag:big', { type: 'tag', name: 'big breasts' })).toBe('language:"chinese" tag:"big breasts" ');
  });
});
