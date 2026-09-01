'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import type { PlaybackInfo } from '@/lib/sources/contracts';
import { loadHanime1Playback } from '@/lib/sources/hanime1/client';

export function PlayerClient({ id }: { id: string }) {
  const [playback, setPlayback] = useState<PlaybackInfo | null>(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadHanime1Playback(id, controller.signal).then(setPlayback).catch((requestError) => {
      if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : '播放地址加载失败');
    });
    return () => controller.abort();
  }, [id, retryKey]);

  const detailUrl = `/?detail=${encodeURIComponent(id)}&source=hanime1`;
  const retryPlayback = () => { setPlayback(null); setError(''); setRetryKey((value) => value + 1); };
  return <main className="grid min-h-dvh grid-rows-[auto_minmax(0,1fr)] bg-black text-white"><header className="flex h-14 items-center gap-3 border-b border-white/10 bg-black/85 px-3 backdrop-blur-xl sm:px-5"><Link href={detailUrl} className="inline-flex size-9 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white" aria-label="返回动漫详情"><ArrowLeft className="size-5" /></Link><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">hanime1.me 播放器</p><p className="text-[11px] text-white/45">视频 ID {id}</p></div>{playback && <a href={playback.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"><ExternalLink className="size-4" />原始媒体</a>}</header><section className="grid min-h-0 place-items-center p-3 sm:p-6">{error ? <div className="max-w-md text-center"><AlertCircle className="mx-auto mb-3 size-7 text-red-400" /><p className="font-medium">播放页加载失败</p><p className="mt-2 text-sm text-white/50">{error}</p><button type="button" onClick={retryPlayback} className={buttonVariants({ variant: 'outline', className: 'mt-5 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white' })}><RefreshCw />稍后重试</button><Link href={detailUrl} className={buttonVariants({ variant: 'ghost', className: 'mt-5 text-white/70 hover:bg-white/10 hover:text-white' })}>返回详情</Link></div> : !playback ? <div className="text-center text-sm text-white/55"><LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-primary" />正在准备播放地址</div> : playback.type === 'hls' ? <div className="max-w-md text-center"><AlertCircle className="mx-auto mb-3 size-7 text-amber-300" /><p className="font-medium">此浏览器需要 HLS 播放支持</p><p className="mt-2 text-sm text-white/50">可使用“原始媒体”在支持 HLS 的播放器中打开。</p></div> : <video controls autoPlay playsInline className="max-h-full max-w-full rounded-xl bg-black shadow-2xl"><source src={playback.url} type={playback.type === 'dash' ? 'application/dash+xml' : undefined} /><track kind="captions" label="未提供字幕" />当前浏览器不支持视频播放。</video>}</section></main>;
}
