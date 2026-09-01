export type SourceKind = 'comic' | 'video';

export interface ContentItem {
  id: string;
  sourceId: string;
  sourceName: string;
  kind: SourceKind;
  title: string;
  subtitle: string;
  coverUrl: string;
  tags: string[];
  progress: number;
  progressLabel: string;
}

export interface ContentDetails extends ContentItem {
  description: string;
  creators: string[];
  entries: ContentEntry[];
}

export interface ContentEntry { id: string; title: string; order: number; }
export interface PageResult<T> { items: T[]; nextCursor?: string; }
export interface SourceContext { signal: AbortSignal; locale: string; }

export interface ComicSource {
  readonly id: string;
  readonly name: string;
  explore(cursor: string | undefined, context: SourceContext): Promise<PageResult<ContentItem>>;
  search(keyword: string, cursor: string | undefined, context: SourceContext): Promise<PageResult<ContentItem>>;
  getDetails(id: string, context: SourceContext): Promise<ContentDetails>;
  getChapter(comicId: string, chapterId: string, context: SourceContext): Promise<string[]>;
}

export interface PlaybackInfo {
  url: string;
  type: 'hls' | 'dash' | 'file';
  headers?: Record<string, string>;
  expiresAt?: string;
}

export interface VideoSource {
  readonly id: string;
  readonly name: string;
  explore(cursor: string | undefined, context: SourceContext): Promise<PageResult<ContentItem>>;
  search(keyword: string, cursor: string | undefined, context: SourceContext): Promise<PageResult<ContentItem>>;
  getDetails(id: string, context: SourceContext): Promise<ContentDetails>;
  resolvePlayback(videoId: string, context: SourceContext): Promise<PlaybackInfo>;
}
