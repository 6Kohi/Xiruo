'use client';
/* oxlint-disable next/no-img-element -- reader pages use signed image proxy URLs */

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ChevronsUp, LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { loadNhentaiChapter } from '@/lib/sources/nhentai/client';

export function ReaderClient({ id, initialPage }: { id: string; initialPage: number }) {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [error, setError] = useState('');
  const pageElements = useRef<Array<HTMLElement | null>>([]);
  const returnToDetails = () => window.location.assign(`/?detail=${encodeURIComponent(id)}`);

  useEffect(() => {
    const controller = new AbortController();
    loadNhentaiChapter(id, controller.signal)
      .then(setPages)
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : '漫画页面加载失败'); });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    const targetIndex = Math.min(initialPage, pages.length) - 1;
    window.requestAnimationFrame(() => pageElements.current[targetIndex]?.scrollIntoView({ block: 'start' }));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      const page = Number((visible?.target as HTMLElement | undefined)?.dataset.page);
      if (page) setCurrentPage(page);
    }, { rootMargin: '-20% 0px -55%', threshold: [0, 0.25, 0.6] });
    pageElements.current.forEach((element) => { if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [initialPage, pages]);

  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-black/85 px-3 backdrop-blur-xl sm:px-5">
        <button type="button" onClick={returnToDetails} className="inline-flex size-9 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" aria-label="返回漫画详情"><ArrowLeft className="size-5" /></button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">nhentai 阅读器</p><p className="text-[11px] text-white/45">ID {id}</p></div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs tabular-nums text-white/70">{pages.length ? `${currentPage} / ${pages.length}` : '加载中'}</span>
        <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 hover:text-white" aria-label="回到顶部" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ChevronsUp /></Button>
      </header>

      {error ? (
        <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-5 text-center"><div><AlertCircle className="mx-auto mb-3 size-7 text-red-400" /><p className="font-medium">阅读页加载失败</p><p className="mt-2 text-sm text-white/50">{error}</p></div></div>
      ) : pages.length === 0 ? (
        <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center text-sm text-white/55"><div className="text-center"><LoaderCircle className="mx-auto mb-3 size-7 animate-spin text-primary" />正在准备漫画页面</div></div>
      ) : (
        <section className="mx-auto w-full max-w-[1100px] leading-none" aria-label="漫画页面">
          {pages.map((page, index) => (
            <figure key={page} ref={(element) => { pageElements.current[index] = element; }} data-page={index + 1} className="relative mx-auto scroll-mt-14 leading-none">
              <img src={page} alt={`第 ${index + 1} 页`} loading={Math.abs(index + 1 - initialPage) <= 1 ? 'eager' : 'lazy'} className="mx-auto block h-auto w-full align-middle" />
              <figcaption className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white/55 backdrop-blur">{index + 1}</figcaption>
            </figure>
          ))}
        </section>
      )}
    </main>
  );
}
