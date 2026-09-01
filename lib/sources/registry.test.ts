import { describe, expect, it } from 'vitest';

import type { ComicSource } from './contracts';
import { SourceRegistry } from './registry';

const source = { id: 'fixture', name: 'Fixture source' } as ComicSource;

describe('SourceRegistry', () => {
  it('registers and resolves a source', () => {
    const registry = new SourceRegistry();
    registry.register(source);
    expect(registry.get('fixture')).toBe(source);
    expect(registry.list()).toEqual([source]);
  });

  it('rejects duplicate ids', () => {
    const registry = new SourceRegistry();
    registry.register(source);
    expect(() => registry.register(source)).toThrow('Duplicate source id');
  });

  it('rejects blank identity fields', () => {
    const registry = new SourceRegistry();
    expect(() => registry.register({ id: '', name: '' } as ComicSource)).toThrow('required');
  });
});
