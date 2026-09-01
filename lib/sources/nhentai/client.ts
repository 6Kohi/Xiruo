import type { ContentDetails, ContentItem, PageResult } from '../contracts';

interface ChapterResponse { images: string[]; }

export async function loadNhentaiItems(query: string, cursor?: string, signal?: AbortSignal): Promise<PageResult<ContentItem>> {
  const params = new URLSearchParams({ action: query.trim() ? 'search' : 'explore' });
  if (query.trim()) params.set('q', query.trim());
  if (cursor) params.set('cursor', cursor);
  return requestJson<PageResult<ContentItem>>(`/api/sources/nhentai?${params}`, signal);
}

export async function loadNhentaiDetails(id: string, signal?: AbortSignal): Promise<ContentDetails> {
  const cachedParams = new URLSearchParams({ action: 'details', id });
  const cached = await tryCached<ContentDetails>(`/api/library/comics?${cachedParams}`, signal);
  if (cached) return cached;
  const sourceParams = new URLSearchParams({ action: 'details', id });
  return requestJson<ContentDetails>(`/api/sources/nhentai?${sourceParams}`, signal);
}

export async function loadNhentaiChapter(id: string, signal?: AbortSignal): Promise<string[]> {
  const cachedParams = new URLSearchParams({ action: 'chapter', id });
  const cached = await tryCached<ChapterResponse>(`/api/library/comics?${cachedParams}`, signal);
  if (cached) return cached.images;
  const sourceParams = new URLSearchParams({ action: 'chapter', id });
  const result = await requestJson<ChapterResponse>(`/api/sources/nhentai?${sourceParams}`, signal);
  return result.images;
}

async function tryCached<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (response.status === 404 || response.status === 409 || response.status === 503) return null;
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `离线缓存读取失败（HTTP ${response.status}）`);
  return data;
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `请求失败（HTTP ${response.status}）`);
  return data;
}
