import type { ContentItem, SourceKind } from '../sources/contracts';

export type LibraryFilter = 'all' | SourceKind;

export function filterContent(items: ContentItem[], filter: LibraryFilter, query: string): ContentItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return items.filter((item) => {
    const matchesKind = filter === 'all' || item.kind === filter;
    const searchable = [item.title, item.subtitle, item.sourceName, ...item.tags]
      .join(' ')
      .toLocaleLowerCase();

    return matchesKind && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}
