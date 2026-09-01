import type { ContentDetails, ContentItem, PageResult, PlaybackInfo } from '../contracts';

export async function loadHanime1Items(query: string, cursor?: string, signal?: AbortSignal): Promise<PageResult<ContentItem>> {
  const params = new URLSearchParams({ action: query.trim() ? 'search' : 'explore' });
  if (query.trim()) params.set('q', query.trim());
  if (cursor) params.set('cursor', cursor);
  return requestJson<PageResult<ContentItem>>(`/api/sources/hanime1?${params}`, signal);
}

export async function loadHanime1Details(id: string, signal?: AbortSignal): Promise<ContentDetails> {
  return requestJson<ContentDetails>(`/api/sources/hanime1?action=details&id=${encodeURIComponent(id)}`, signal);
}

export async function loadHanime1Playback(id: string, signal?: AbortSignal): Promise<PlaybackInfo> {
  return requestJson<PlaybackInfo>(`/api/sources/hanime1?action=playback&id=${encodeURIComponent(id)}`, signal);
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `请求失败（HTTP ${response.status}）`);
  return data;
}
