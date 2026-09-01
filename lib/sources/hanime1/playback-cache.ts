import type { PlaybackInfo } from '../contracts';

const cacheLifetimeMs = 10 * 60_000;
const playbackCache = new Map<string, { expiresAt: number; playback: PlaybackInfo }>();

export function getCachedPlayback(id: string, now = Date.now()): PlaybackInfo | undefined {
  const entry = playbackCache.get(id);
  if (!entry) return undefined;
  if (entry.expiresAt <= now) {
    playbackCache.delete(id);
    return undefined;
  }
  return entry.playback;
}

export function cachePlayback(id: string, playback: PlaybackInfo, now = Date.now()): void {
  playbackCache.set(id, { playback, expiresAt: now + cacheLifetimeMs });
}
