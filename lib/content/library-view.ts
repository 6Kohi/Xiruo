import type { ContentItem, SourceKind } from '../sources/contracts';

export type LibrarySort = 'recent' | 'title' | 'shortest' | 'longest';
export type LengthFilter = 'all' | 'short' | 'medium' | 'long';
export type LanguageFilter = 'all' | 'English' | '日本語' | '中文';

interface LibraryViewOptions {
  kind: SourceKind;
  sort: LibrarySort;
  length: LengthFilter;
  language: LanguageFilter;
  tag: string;
}

const languages = new Set<LanguageFilter>(['English', '日本語', '中文']);

export function buildLibraryView(items: ContentItem[], options: LibraryViewOptions): ContentItem[] {
  const filtered = items.filter((item) => {
    const metric = itemMetric(item);
    const matchesLength = options.length === 'all' || (metric > 0 && lengthGroup(metric, options.kind) === options.length);
    const matchesLanguage = options.kind === 'video' || options.language === 'all' || item.tags.includes(options.language);
    const matchesTag = options.tag === 'all' || item.tags.some((tag) => tag.toLocaleLowerCase() === options.tag.toLocaleLowerCase());
    return matchesLength && matchesLanguage && matchesTag;
  });

  if (options.sort === 'recent') return filtered;
  return [...filtered].sort((left, right) => {
    if (options.sort === 'title') return left.title.localeCompare(right.title);
    const difference = itemMetric(left) - itemMetric(right);
    return options.sort === 'shortest' ? difference : -difference;
  });
}

export function availableTags(items: ContentItem[], limit = 18): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of new Set(item.tags)) {
      if (!tag || languages.has(tag as LanguageFilter)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.keys()].sort((left, right) => (counts.get(right) ?? 0) - (counts.get(left) ?? 0) || left.localeCompare(right)).slice(0, limit);
}

export function itemMetric(item: ContentItem): number {
  if (item.kind === 'comic') return Number(item.subtitle.match(/\d+/)?.[0] ?? 0);
  const parts = item.subtitle.match(/\d+/g)?.map(Number) ?? [];
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parts[0] ?? 0;
}

function lengthGroup(value: number, kind: SourceKind): LengthFilter {
  if (kind === 'comic') return value <= 20 ? 'short' : value <= 50 ? 'medium' : 'long';
  return value <= 10 ? 'short' : value <= 30 ? 'medium' : 'long';
}
