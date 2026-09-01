import type { ComicSource, VideoSource } from './contracts';

export type AnySource = ComicSource | VideoSource;

export class SourceRegistry {
  readonly #sources = new Map<string, AnySource>();

  register(source: AnySource): void {
    if (!source.id.trim() || !source.name.trim()) {
      throw new Error('Source id and name are required');
    }
    if (this.#sources.has(source.id)) {
      throw new Error(`Duplicate source id: ${source.id}`);
    }
    this.#sources.set(source.id, source);
  }

  get(id: string): AnySource {
    const source = this.#sources.get(id);
    if (!source) throw new Error(`Unknown source: ${id}`);
    return source;
  }

  list(): AnySource[] {
    return [...this.#sources.values()];
  }
}
