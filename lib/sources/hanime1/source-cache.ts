interface CacheEntry<T> {
  value: T;
  freshUntil: number;
  staleUntil: number;
}

export type SourceCacheStatus = 'HIT' | 'MISS' | 'STALE' | 'COALESCED';

const entries = new Map<string, CacheEntry<unknown>>();
const pendingLoads = new Map<string, Promise<unknown>>();

export async function loadCachedSource<T>(
  key: string,
  load: () => Promise<T>,
  options: { freshForMs: number; staleForMs: number },
  now = Date.now(),
): Promise<{ value: T; status: SourceCacheStatus }> {
  const cached = entries.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.freshUntil > now) return { value: cached.value, status: 'HIT' };

  const pending = pendingLoads.get(key) as Promise<T> | undefined;
  if (pending) {
    try {
      return { value: await pending, status: 'COALESCED' };
    } catch (error) {
      if (cached && cached.staleUntil > now) return { value: cached.value, status: 'STALE' };
      throw error;
    }
  }

  const loading = load();
  pendingLoads.set(key, loading);
  try {
    const value = await loading;
    entries.set(key, {
      value,
      freshUntil: now + options.freshForMs,
      staleUntil: now + options.staleForMs,
    });
    return { value, status: 'MISS' };
  } catch (error) {
    if (cached && cached.staleUntil > now) return { value: cached.value, status: 'STALE' };
    throw error;
  } finally {
    pendingLoads.delete(key);
  }
}
