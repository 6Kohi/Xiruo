import type { ContentItem } from '@/lib/sources/contracts';

export interface ComicFavorite extends ContentItem {
  savedAt: number;
  cacheStatus: 'downloading' | 'ready' | 'error';
  cachedPages: number;
  totalPages: number;
  cacheError?: string;
}

export async function listComicFavorites(signal?: AbortSignal): Promise<ComicFavorite[]> {
  const response = await requestJson<{ items: ComicFavorite[] }>('/api/library/comics?action=list', { signal });
  return response.items;
}

export async function saveComicFavorite(item: ContentItem, signal?: AbortSignal): Promise<ComicFavorite> {
  return requestJson<ComicFavorite>('/api/library/comics', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ item }),
  });
}

export async function removeComicFavorite(id: string, signal?: AbortSignal): Promise<void> {
  await requestJson(`/api/library/comics?id=${encodeURIComponent(id)}`, { method: 'DELETE', signal });
}

async function requestJson<T = unknown>(url: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  const response = await fetch(url, { ...init, headers });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `漫画收藏请求失败（HTTP ${response.status}）`);
  return data;
}
