'use client';
/* oxlint-disable next/no-img-element -- source images are signed, short-lived proxy URLs */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookOpen, Check, Clock3, Film, Heart, Images, Library, ListFilter, LoaderCircle, Menu, RefreshCw, RotateCcw, Search, Settings2, Tags, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { buildLibraryView, type LibrarySort } from '@/lib/content/library-view';
import { listComicFavorites, removeComicFavorite, saveComicFavorite, type ComicFavorite } from '@/lib/content/comic-favorites';
import { activeNhentaiCatalogToken, appendNhentaiOperator, applyNhentaiSuggestion, nhentaiSearchOperators, searchNhentaiSuggestions } from '@/lib/content/nhentai-search';
import { buildVideoTagQuery, videoTagGroups, type VideoTagMatch } from '@/lib/content/video-tags';
import type { ContentDetails, ContentItem, SourceKind } from '@/lib/sources/contracts';
import { loadHanime1Details, loadHanime1Items } from '@/lib/sources/hanime1/client';
import { loadNhentaiChapter, loadNhentaiDetails, loadNhentaiItems } from '@/lib/sources/nhentai/client';

const PAGE_SIZE = 9;
type SourceId = 'nhentai' | 'picacg' | 'ehentai' | 'hanime1';
type VideoType = 'all' | '裏番' | 'Motion Anime' | '3D';
type LibrarySection = SourceKind | 'favorites';

const sourceOptions: Array<{ id: SourceId; name: string; kind: SourceKind; ready: boolean }> = [
  { id: 'nhentai', name: 'nhentai', kind: 'comic', ready: true },
  { id: 'picacg', name: 'Picacg', kind: 'comic', ready: false },
  { id: 'ehentai', name: 'E-Hentai', kind: 'comic', ready: false },
  { id: 'hanime1', name: 'hanime1.me', kind: 'video', ready: true },
];

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnedDetailId = searchParams.get('detail');
  const returnedSource = searchParams.get('source');
  const [filter, setFilter] = useState<SourceKind>(() => returnedSource === 'hanime1' ? 'video' : 'comic');
  const [section, setSection] = useState<LibrarySection>(() => returnedSource === 'hanime1' ? 'video' : 'comic');
  const [activeSourceId, setActiveSourceId] = useState<SourceId>(() => returnedSource === 'hanime1' ? 'hanime1' : 'nhentai');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationPaused, setPaginationPaused] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sort, setSort] = useState<LibrarySort>('recent');
  const [comicQuery, setComicQuery] = useState('');
  const [favoriteItems, setFavoriteItems] = useState<ComicFavorite[]>([]);
  const [favoriteError, setFavoriteError] = useState('');
  const [videoTags, setVideoTags] = useState<string[]>([]);
  const [videoTagMatch, setVideoTagMatch] = useState<VideoTagMatch>('broad');
  const [videoType, setVideoType] = useState<VideoType>('all');
  const [videoTagsOpen, setVideoTagsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(() => returnedDetailId ? detailPlaceholder(returnedDetailId, returnedSource) : null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sourceQuery = filter === 'video' ? [videoType === 'all' ? '' : videoType, buildVideoTagQuery(videoTags, videoTagMatch)].filter(Boolean).join(' ') : comicQuery;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await loadItems(activeSourceId, sourceQuery, undefined, controller.signal);
        setItems(result.items);
        setNextCursor(result.nextCursor);
        setPaginationPaused(false);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setItems([]);
        setNextCursor(undefined);
        setError(requestError instanceof Error ? requestError.message : '真实来源加载失败');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 0);

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeSourceId, reloadKey, sourceQuery]);

  const refreshFavorites = useCallback(async () => {
    try {
      setFavoriteItems(await listComicFavorites());
      setFavoriteError('');
    } catch (requestError) {
      setFavoriteError(requestError instanceof Error ? requestError.message : '漫画收藏读取失败');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshFavorites(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshFavorites]);

  useEffect(() => {
    if (!favoriteItems.some((favorite) => favorite.cacheStatus === 'downloading')) return;
    const timer = window.setInterval(() => void refreshFavorites(), 2_500);
    return () => window.clearInterval(timer);
  }, [favoriteItems, refreshFavorites]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => { if (event.matches) setMobileNavOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  const libraryItems = section === 'favorites' ? favoriteItems : items;
  const filteredItems = useMemo(() => buildLibraryView(libraryItems, { kind: filter, sort, length: 'all', language: 'all', tag: 'all' }), [filter, libraryItems, sort]);
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasLocalItems = visibleCount < filteredItems.length;
  const activeFilterCount = Number(sort !== 'recent') + Number(filter === 'comic' && comicQuery.length > 0);

  const selectFilter = useCallback((nextFilter: SourceKind) => {
    setSection(nextFilter);
    setFilter(nextFilter);
    setActiveSourceId(nextFilter === 'comic' ? 'nhentai' : 'hanime1');
    setItems([]);
    setSort('recent');
    setComicQuery('');
    setVideoTags([]);
    setVideoTagMatch('broad');
    setVideoType('all');
    setVisibleCount(PAGE_SIZE);
    setPaginationPaused(false);
  }, []);

  const selectFavorites = useCallback(() => {
    setSection('favorites');
    setFilter('comic');
    setVisibleCount(PAGE_SIZE);
    setSelectedItem(null);
    void refreshFavorites();
  }, [refreshFavorites]);

  const toggleFavorite = useCallback(async (item: ContentItem) => {
    if (item.kind !== 'comic') return;
    const saved = favoriteItems.some((favorite) => favorite.id === item.id);
    try {
      if (saved) await removeComicFavorite(item.id);
      else await saveComicFavorite(item);
      await refreshFavorites();
    } catch (requestError) {
      setFavoriteError(requestError instanceof Error ? requestError.message : '漫画收藏更新失败');
    }
  }, [favoriteItems, refreshFavorites]);

  const loadMore = useCallback(async () => {
    if (section === 'favorites') {
      if (visibleCount < filteredItems.length) setVisibleCount((current) => current + PAGE_SIZE);
      return;
    }
    if (loadingMore) return;
    if (visibleCount < filteredItems.length) {
      setVisibleCount((current) => current + PAGE_SIZE);
      return;
    }
    if (!nextCursor) return;
    setLoadingMore(true);
    setError('');
    try {
      const result = await loadItems(activeSourceId, sourceQuery, nextCursor);
      setItems((current) => [...current, ...result.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextCursor(result.nextCursor);
      setVisibleCount((current) => current + PAGE_SIZE);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载下一页失败');
      setPaginationPaused(true);
    } finally {
      setLoadingMore(false);
    }
  }, [activeSourceId, filteredItems.length, loadingMore, nextCursor, section, sourceQuery, visibleCount]);

  const selectSource = useCallback((sourceId: SourceId) => {
    setSection('comic');
    setActiveSourceId(sourceId);
    setSort('recent');
    setComicQuery('');
    setVisibleCount(PAGE_SIZE);
    setPaginationPaused(false);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/78 shadow-[0_1px_0_oklch(1_0_0/3%)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-7">
          <Button variant="ghost" size="icon" className="-ml-2 shrink-0 lg:hidden" aria-label="打开导航菜单" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}><Menu /></Button>
          <div className="flex min-w-fit items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_color-mix(in_oklch,var(--primary)_28%,transparent)]"><Library className="size-4.5" aria-hidden="true" /></div>
            <div><p className="font-heading text-[15px] font-semibold leading-none tracking-tight">Xiruo</p><p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Private library</p></div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="打开设置"><Settings2 /></Button>
          </div>
        </div>
      </header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(88vw,320px)] gap-0 overflow-y-auto border-border/80 bg-background/98 p-0 backdrop-blur-xl sm:max-w-[320px]">
          <SheetHeader className="border-b border-border/70 px-5 py-5 pr-12">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Library className="size-4.5" /></div><div><SheetTitle className="font-heading text-base">Xiruo</SheetTitle><SheetDescription className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em]">Private library</SheetDescription></div></div>
          </SheetHeader>
          <div className="p-4"><NavigationPanel active={section} onSelect={(nextFilter) => { selectFilter(nextFilter); setMobileNavOpen(false); }} onSelectFavorites={() => { selectFavorites(); setMobileNavOpen(false); }} /></div>
        </SheetContent>
      </Sheet>

      <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[208px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-22"><NavigationPanel active={section} onSelect={selectFilter} onSelectFavorites={selectFavorites} /></div>
        </aside>

        <section className="min-w-0">
          {section === 'favorites' ? <FavoritesToolbar resultCount={filteredItems.length} sort={sort} setSort={(value) => { setSort(value); setVisibleCount(PAGE_SIZE); }} /> : filter === 'video' ? <VideoBrowseToolbar type={videoType} setType={(value) => { setVideoType(value); setVisibleCount(PAGE_SIZE); }} selectedTags={videoTags} onOpenTags={() => setVideoTagsOpen(true)} /> : <BrowseToolbar kind={filter} activeSourceId={activeSourceId} onSourceChange={selectSource} sort={sort} setSort={(value) => { setSort(value); setVisibleCount(PAGE_SIZE); }} query={comicQuery} onSearch={(value) => { setComicQuery(value); setVisibleCount(PAGE_SIZE); setPaginationPaused(false); }} activeCount={activeFilterCount} onReset={() => { setSort('recent'); setComicQuery(''); setVisibleCount(PAGE_SIZE); }} />}

          {(section === 'favorites' ? favoriteError : error) && <ErrorNotice message={section === 'favorites' ? favoriteError : error} onRetry={() => { if (section === 'favorites') void refreshFavorites(); else { setPaginationPaused(false); setReloadKey((value) => value + 1); } }} />}
          {section !== 'favorites' && loading ? <LoadingGrid count={PAGE_SIZE} /> : visibleItems.length > 0 ? <><div className="content-grid">{visibleItems.map((item) => <ContentCard key={item.id} item={item} favorite={favoriteItems.find((favorite) => favorite.id === item.id)} onToggleFavorite={() => void toggleFavorite(item)} onOpen={() => setSelectedItem(item)} />)}</div><InfiniteScrollSentinel enabled={section === 'favorites' ? hasLocalItems : !paginationPaused && (hasLocalItems || Boolean(nextCursor))} loading={loadingMore} onVisible={loadMore} /></> : !(section === 'favorites' ? favoriteError : error) && <EmptyState video={filter === 'video'} favorites={section === 'favorites'} />}
        </section>
      </div>
      <ContentDialog key={`${selectedItem?.sourceId ?? 'closed'}-${selectedItem?.id ?? ''}`} item={selectedItem} favorite={Boolean(selectedItem && favoriteItems.some((favorite) => favorite.id === selectedItem.id))} onToggleFavorite={() => { if (selectedItem) void toggleFavorite(selectedItem); }} onClose={() => { setSelectedItem(null); if (returnedDetailId) router.replace('/', { scroll: false }); }} />
      {videoTagsOpen && <VideoTagDialog open value={videoTags} match={videoTagMatch} onOpenChange={setVideoTagsOpen} onApply={(tags, match) => { setVideoTags(tags); setVideoTagMatch(match); setVisibleCount(PAGE_SIZE); setVideoTagsOpen(false); }} />}
    </main>
  );
}

function BrowseToolbar({ kind, activeSourceId, onSourceChange, sort, setSort, query, onSearch, activeCount, onReset }: { kind: SourceKind; activeSourceId: SourceId; onSourceChange: (sourceId: SourceId) => void; sort: LibrarySort; setSort: (value: LibrarySort) => void; query: string; onSearch: (value: string) => void; activeCount: number; onReset: () => void }) {
  const sources = sourceOptions.filter((source) => source.kind === kind);
  return (
    <div className="mb-5 space-y-3">
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/55 bg-card/55 p-1.5 shadow-[inset_0_1px_0_oklch(1_0_0/4%),0_8px_28px_oklch(0_0_0/8%)] backdrop-blur-xl">
        <span className="shrink-0 px-2 text-xs font-medium text-muted-foreground">漫画源</span>
        {sources.map((source) => {
          const active = source.id === activeSourceId;
          return <button key={source.id} type="button" disabled={!source.ready} aria-pressed={active} onClick={() => onSourceChange(source.id)} className={`inline-flex h-11 w-36 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 ${active ? 'border-primary/30 bg-primary text-primary-foreground shadow-[0_5px_18px_color-mix(in_oklch,var(--primary)_22%,transparent)]' : 'border-transparent bg-muted/45 text-muted-foreground hover:bg-muted/75 hover:text-foreground'}`}><span className={`size-1.5 rounded-full ${source.ready ? active ? 'bg-primary-foreground' : 'bg-emerald-400' : 'bg-amber-400'}`} />{source.name}{!source.ready && <span className="text-[10px] font-normal">待接入</span>}</button>;
        })}
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
        {activeSourceId === 'nhentai' && <NhentaiSearchControl key={query} value={query} onSearch={onSearch} />}
        <div className="flex shrink-0 items-center gap-1.5"><span className="text-xs text-muted-foreground">排序</span><NativeSelect value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)} aria-label="排序方式" className="h-11 [&_select]:h-11"><NativeSelectOption value="recent">最新优先</NativeSelectOption><NativeSelectOption value="title">标题顺序</NativeSelectOption><NativeSelectOption value="shortest">页数从少到多</NativeSelectOption><NativeSelectOption value="longest">页数从多到少</NativeSelectOption></NativeSelect>{activeCount > 0 && <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onReset}><RotateCcw />重置</Button>}</div>
      </div>
    </div>
  );
}

function FavoritesToolbar({ resultCount, sort, setSort }: { resultCount: number; sort: LibrarySort; setSort: (value: LibrarySort) => void }) {
  return <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-border/70 pb-5"><div className="mr-auto"><div className="flex items-baseline gap-3"><h1 className="font-heading text-2xl font-semibold tracking-tight">漫画收藏</h1><span className="text-xs text-muted-foreground">{resultCount} 项</span></div><p className="mt-1 text-xs text-muted-foreground">收藏内容会缓存到服务器挂载磁盘，缓存完成后可离线阅读。</p></div><div className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground">排序</span><NativeSelect value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)} aria-label="收藏排序"><NativeSelectOption value="recent">最近收藏</NativeSelectOption><NativeSelectOption value="title">标题顺序</NativeSelectOption><NativeSelectOption value="shortest">页数从少到多</NativeSelectOption><NativeSelectOption value="longest">页数从多到少</NativeSelectOption></NativeSelect></div></div>;
}

function NhentaiSearchControl({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const token = activeNhentaiCatalogToken(draft);
  const suggestions = searchNhentaiSuggestions(draft);

  const submit = () => {
    onSearch(draft.trim());
    setOpen(false);
  };

  return (
    <div className="relative z-20 min-w-0 flex-1" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <form className="flex min-h-11 overflow-hidden rounded-2xl border border-border/65 bg-card/65 shadow-[inset_0_1px_0_oklch(1_0_0/4%),0_8px_24px_oklch(0_0_0/7%)] backdrop-blur-xl focus-within:border-primary/55 focus-within:ring-3 focus-within:ring-primary/12" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <Search className="ml-3 mt-3 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input value={draft} onFocus={() => setOpen(true)} onChange={(event) => { setDraft(event.target.value); setOpen(true); }} className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="搜索标题，或选择 tag、artist、parody 等条件" aria-label="nhentai 搜索条件" autoComplete="off" />
        {draft && <Button type="button" variant="ghost" size="icon" className="m-1 size-8 shrink-0" aria-label="清除搜索" onClick={() => { setDraft(''); onSearch(''); setOpen(true); }}><X /></Button>}
        <Button type="submit" size="sm" className="m-1 h-9 shrink-0 rounded-xl px-4">搜索</Button>
      </form>
      {open && (
        <div className="absolute inset-x-0 top-full mt-2 max-h-[min(430px,60vh)] overflow-y-auto rounded-xl border border-border bg-popover/98 p-1.5 shadow-2xl backdrop-blur-xl">
          {token ? suggestions.length > 0 ? suggestions.map((suggestion) => (
            <button key={`${suggestion.type}-${suggestion.name}`} type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none" onMouseDown={(event) => event.preventDefault()} onClick={() => { setDraft(applyNhentaiSuggestion(draft, suggestion)); setOpen(true); }}>
              <Badge variant="secondary" className="shrink-0 uppercase">{suggestion.type}</Badge>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{suggestion.name}</span>{suggestion.description && <span className="block truncate text-xs text-muted-foreground">{suggestion.description}</span>}</span>
              {suggestion.count && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{suggestion.count}</span>}
            </button>
          )) : <div className="px-3 py-5 text-center text-xs text-muted-foreground">本次本地快照没有匹配项；仍可直接输入后搜索。</div> : nhentaiSearchOperators.map((operator) => (
            <button key={operator.key} type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none" onMouseDown={(event) => event.preventDefault()} onClick={() => { setDraft(appendNhentaiOperator(draft, operator)); setOpen(true); }}>
              <code className="w-28 shrink-0 text-sm text-primary">{operator.syntax}</code><span className="min-w-0 flex-1"><span className="block text-sm">{operator.label}</span><span className="block truncate text-xs text-muted-foreground">{operator.hint}</span></span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">候选来自 2026-09-01 浏览器快照；提交后由 nhentai 真实搜索解析组合条件。</p>
    </div>
  );
}

function VideoBrowseToolbar({ type, setType, selectedTags, onOpenTags }: { type: VideoType; setType: (value: VideoType) => void; selectedTags: string[]; onOpenTags: () => void }) {
  return <div className="mb-5 flex flex-wrap items-center gap-2"><div className="relative"><ListFilter className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" /><NativeSelect value={type} onChange={(event) => setType(event.target.value as VideoType)} aria-label="动漫类型" className="h-10 rounded-xl bg-card/60 pl-9 pr-8"><NativeSelectOption value="all">全部类型</NativeSelectOption><NativeSelectOption value="裏番">里番</NativeSelectOption><NativeSelectOption value="Motion Anime">Motion Anime</NativeSelectOption><NativeSelectOption value="3D">3D 动画</NativeSelectOption></NativeSelect></div><Button type="button" variant={selectedTags.length > 0 ? 'default' : 'outline'} className="h-10 rounded-xl px-4" onClick={onOpenTags}><Tags />内容标签{selectedTags.length > 0 && <span className="rounded-full bg-background/18 px-1.5 text-[10px] tabular-nums">{selectedTags.length}</span>}</Button></div>;
}

function VideoTagDialog({ open, value, match, onOpenChange, onApply }: { open: boolean; value: string[]; match: VideoTagMatch; onOpenChange: (open: boolean) => void; onApply: (tags: string[], match: VideoTagMatch) => void }) {
  const [draft, setDraft] = useState(value);
  const [draftMatch, setDraftMatch] = useState(match);

  const toggleTag = (tag: string) => setDraft((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent showCloseButton={false} className="grid h-[min(880px,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-[820px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-border bg-popover p-0 shadow-2xl sm:h-[min(880px,calc(100dvh-2rem))] sm:w-[calc(100vw-2rem)] sm:rounded-3xl"><DialogHeader className="relative flex-row items-center justify-center border-b border-border/70 px-14 py-4"><DialogTitle className="text-lg font-semibold">内容标签</DialogTitle><DialogDescription className="sr-only">选择一个或多个动漫内容标签</DialogDescription><Button type="button" variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2" aria-label="关闭内容标签" onClick={() => onOpenChange(false)}><X /></Button>{draft.length > 0 && <span className="absolute right-4 text-xs text-muted-foreground">已选 {draft.length}</span>}</DialogHeader><div className="min-h-0 overflow-y-auto"><section className="flex items-center gap-4 border-b border-border/70 bg-muted/55 px-5 py-4 sm:px-6"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">广泛配对</p><p className="mt-1 text-xs leading-5 text-muted-foreground">启用时使用宽松关键词组合；关闭后把每个标签作为完整词组匹配。</p></div><Switch checked={draftMatch === 'broad'} onCheckedChange={(checked) => setDraftMatch(checked ? 'broad' : 'strict')} aria-label="广泛配对" /></section><div className="space-y-7 px-5 py-6 sm:px-7">{videoTagGroups.map((group) => <section key={group.label}><h3 className="mb-3 text-sm font-semibold text-foreground">{group.label}</h3><div className="flex flex-wrap gap-2">{group.tags.map((tag) => { const selected = draft.includes(tag); return <button key={tag} type="button" aria-pressed={selected} onClick={() => toggleTag(tag)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_22px_color-mix(in_oklch,var(--primary)_18%,transparent)]' : 'border-border bg-card/45 text-muted-foreground hover:border-primary/55 hover:text-foreground'}`}>{selected && <Check className="size-3.5" />}{tag}</button>; })}</div></section>)}</div></div><div className="flex items-center gap-3 border-t border-border/70 bg-popover/96 px-4 py-3 backdrop-blur sm:px-6"><Button type="button" variant="ghost" className="mr-auto rounded-xl text-muted-foreground" disabled={draft.length === 0} onClick={() => setDraft([])}><RotateCcw />清除</Button><Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>取消</Button><Button type="button" className="min-w-32 rounded-xl" onClick={() => onApply(draft, draftMatch)}>显示搜索结果{draft.length > 0 ? ` · ${draft.length}` : ''}</Button></div></DialogContent></Dialog>;
}

function NavigationPanel({ active, onSelect, onSelectFavorites }: { active: LibrarySection; onSelect: (filter: SourceKind) => void; onSelectFavorites: () => void }) {
  return <nav aria-label="内容分类" className="space-y-1"><NavItem icon={BookOpen} label="漫画" active={active === 'comic'} onClick={() => onSelect('comic')} /><NavItem icon={Film} label="动漫" active={active === 'video'} onClick={() => onSelect('video')} /><NavItem icon={Heart} label="收藏" active={active === 'favorites'} onClick={onSelectFavorites} /><NavItem icon={Clock3} label="历史记录" /></nav>;
}

function NavItem({ icon: Icon, label, active = false, onClick }: { icon: typeof BookOpen; label: string; active?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? 'bg-primary/12 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" aria-hidden="true" />{label}</button>;
}

function ContentCard({ item, favorite, onToggleFavorite, onOpen }: { item: ContentItem; favorite?: ComicFavorite; onToggleFavorite: () => void; onOpen: () => void }) {
  const isVideo = item.kind === 'video';
  const cacheLabel = favorite?.cacheStatus === 'ready' ? '已离线' : favorite?.cacheStatus === 'downloading' ? `缓存中 ${favorite.cachedPages}/${favorite.totalPages}` : favorite?.cacheStatus === 'error' ? '缓存失败' : '';
  return <article className="group min-w-0"><div className="relative"><button className="block w-full text-left" aria-label={`打开${item.title}`} onClick={onOpen}><div className={`relative overflow-hidden rounded-xl bg-muted ring-1 ring-border/70 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)] ${isVideo ? 'aspect-video' : 'aspect-[3/4]'}`}><img src={item.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/25 to-transparent" /><Badge className="absolute left-2 top-2 bg-black/58 text-white backdrop-blur-md">{isVideo ? <Film aria-hidden="true" /> : <BookOpen aria-hidden="true" />}{isVideo ? '动漫' : '漫画'}</Badge>{isVideo && item.subtitle && <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{item.subtitle}</span>}{cacheLabel && <span className={`absolute bottom-2 left-2 rounded-full px-2 py-1 text-[10px] text-white backdrop-blur-md ${favorite?.cacheStatus === 'error' ? 'bg-red-500/80' : favorite?.cacheStatus === 'ready' ? 'bg-emerald-500/80' : 'bg-black/65'}`}>{cacheLabel}</span>}</div><div className="px-0.5 pt-2.5"><div className="flex items-start justify-between gap-2"><h2 className="line-clamp-2 font-heading text-[14px] font-semibold leading-5 tracking-tight">{item.title}</h2><span className="mt-0.5 shrink-0 text-[10px] font-medium text-primary">{item.sourceName}</span></div>{!isVideo && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>}</div></button>{!isVideo && <Button type="button" variant="secondary" size="icon" className={`absolute right-2 top-2 z-10 size-8 rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md hover:bg-black/80 ${favorite ? 'text-primary' : ''}`} aria-label={favorite ? '取消收藏' : '收藏漫画'} aria-pressed={Boolean(favorite)} onClick={onToggleFavorite}><Heart className={favorite ? 'fill-current' : ''} /></Button>}</div></article>;
}

function ContentDialog({ item, favorite, onToggleFavorite, onClose }: { item: ContentItem | null; favorite: boolean; onToggleFavorite: () => void; onClose: () => void }) {
  if (!item) return null;
  return item.kind === 'video' ? <VideoDialog item={item} onClose={onClose} /> : <ComicDialog item={item} favorite={favorite} onToggleFavorite={onToggleFavorite} onClose={onClose} />;
}

function ComicDialog({ item, favorite, onToggleFavorite, onClose }: { item: ContentItem | null; favorite: boolean; onToggleFavorite: () => void; onClose: () => void }) {
  const [details, setDetails] = useState<ContentDetails | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingPages, setLoadingPages] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item) return;
    const controller = new AbortController();
    loadNhentaiDetails(item.id, controller.signal).then(setDetails).catch((requestError) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : '详情加载失败'); }).finally(() => { if (!controller.signal.aborted) setLoadingDetails(false); });
    loadNhentaiChapter(item.id, controller.signal).then(setPages).catch((requestError) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : '页面预览加载失败'); }).finally(() => { if (!controller.signal.aborted) setLoadingPages(false); });
    return () => controller.abort();
  }, [item]);

  return <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent showCloseButton={false} className="grid h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border border-border bg-popover/98 p-0 shadow-2xl backdrop-blur-xl sm:h-[min(900px,calc(100dvh-2rem))] sm:w-[calc(100vw-2rem)] sm:max-w-[1120px] sm:rounded-3xl">{item && <><DialogHeader className="min-w-0 flex-row items-center border-b border-border/70 px-4 py-3 pr-3 sm:px-5"><div className="min-w-0 flex-1"><DialogTitle className="truncate text-base">{details?.title || item.title}</DialogTitle><DialogDescription className="mt-1 truncate">{item.sourceName} · {details?.subtitle || item.subtitle}</DialogDescription></div><Button variant="ghost" size="icon" className={favorite ? 'shrink-0 text-primary' : 'shrink-0'} aria-label={favorite ? '取消收藏' : '收藏漫画'} aria-pressed={favorite} onClick={onToggleFavorite}><Heart className={favorite ? 'fill-current' : ''} /></Button><Button variant="ghost" size="icon" className="shrink-0" aria-label="关闭" onClick={onClose}><X /></Button></DialogHeader><DetailsPanel item={item} details={details} pages={pages} error={error} loadingDetails={loadingDetails} loadingPages={loadingPages} /></>}</DialogContent></Dialog>;
}

function VideoDialog({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const [details, setDetails] = useState<ContentDetails | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    loadHanime1Details(item.id, controller.signal).then(setDetails).catch((requestError) => { if (!controller.signal.aborted) setError(errorMessage(requestError)); });
    return () => controller.abort();
  }, [item.id]);

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent showCloseButton={false} className="grid h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border border-border bg-popover/98 p-0 shadow-2xl backdrop-blur-xl sm:h-[min(760px,calc(100dvh-2rem))] sm:w-[calc(100vw-2rem)] sm:max-w-[920px] sm:rounded-3xl"><DialogHeader className="min-w-0 flex-row items-center border-b border-border/70 px-4 py-3 pr-3 sm:px-5"><div className="min-w-0 flex-1"><DialogTitle className="truncate text-base">{details?.title || item.title}</DialogTitle><DialogDescription className="mt-1 truncate">{item.sourceName} · {details?.subtitle || item.subtitle}</DialogDescription></div><Button variant="ghost" size="icon" className="shrink-0" aria-label="关闭" onClick={onClose}><X /></Button></DialogHeader><div className="min-h-0 overflow-y-auto p-4 sm:p-6"><div className="grid min-w-0 gap-6 md:grid-cols-[minmax(180px,240px)_minmax(0,1fr)]"><div className="mx-auto w-full max-w-[240px]"><div className="aspect-[3/4] overflow-hidden rounded-2xl bg-muted ring-1 ring-border"><img src={details?.coverUrl || item.coverUrl} alt="" className="h-full w-full object-cover" /></div></div><div className="min-w-0"><Badge variant="outline" className="border-primary/20 text-primary"><Film /> hanime1.me 动漫</Badge><h2 className="mt-4 break-words font-heading text-2xl font-semibold leading-tight">{details?.title || item.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{details?.description || '正在载入视频详情。'}</p>{details?.tags && details.tags.length > 0 && <div className="mt-4 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">{details.tags.slice(0, 24).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>}{error && <p className="mt-4 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="size-4" />{error}</p>}<Link href={playerUrl(item.id)} className={buttonVariants({ size: 'lg', className: 'mt-6 w-full rounded-xl sm:w-auto' })}><Film />开始播放</Link></div></div></div></DialogContent></Dialog>;
}

function DetailsPanel({ item, details, pages, error, loadingDetails, loadingPages }: { item: ContentItem; details: ContentDetails | null; pages: string[]; error: string; loadingDetails: boolean; loadingPages: boolean }) {
  if (loadingDetails) return <div className="grid min-h-80 place-items-center"><div className="text-center text-sm text-muted-foreground"><LoaderCircle className="mx-auto mb-3 size-6 animate-spin text-primary" />正在载入详情</div></div>;
  return <div className="min-h-0 overflow-y-auto p-4 sm:p-6"><div className="grid min-w-0 gap-6 md:grid-cols-[minmax(180px,240px)_minmax(0,1fr)]"><div className="mx-auto w-full max-w-[240px]"><div className="aspect-[3/4] overflow-hidden rounded-2xl bg-muted ring-1 ring-border"><img src={details?.coverUrl || item.coverUrl} alt="" className="h-full w-full object-cover" /></div></div><div className="min-w-0"><Badge variant="outline" className="border-primary/20 text-primary"><BookOpen /> nhentai 漫画</Badge><h2 className="mt-4 break-words font-heading text-2xl font-semibold leading-tight">{details?.title || item.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{details?.description || '暂无详情说明'}</p>{details?.creators && details.creators.length > 0 && <p className="mt-4 break-words text-sm"><span className="text-muted-foreground">创作者：</span>{details.creators.join('、')}</p>}{details?.tags && details.tags.length > 0 && <div className="mt-4 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">{details.tags.slice(0, 24).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>}{error && <p className="mt-4 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="size-4" />{error}</p>}<a href={readerUrl(item.id, 1)} className={buttonVariants({ size: 'lg', className: 'mt-6 w-full rounded-xl sm:w-auto' })}>{loadingPages ? <LoaderCircle className="animate-spin" /> : <Images />} {loadingPages ? '正在准备页面' : '开始阅读'}</a></div></div><PageThumbnails id={item.id} pages={pages} loading={loadingPages} /></div>;
}

function PageThumbnails({ id, pages, loading }: { id: string; pages: string[]; loading: boolean }) {
  return <section className="mt-7 border-t border-border/70 pt-5"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-sm font-medium">页面预览</p><p className="mt-1 text-xs text-muted-foreground">点击任意缩略图，从这一页开始阅读。</p></div>{pages.length > 0 && <span className="text-xs tabular-nums text-muted-foreground">共 {pages.length} 页</span>}</div>{loading ? <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />)}</div> : pages.length > 0 ? <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">{pages.map((page, index) => <a key={page} href={readerUrl(id, index + 1)} className="group overflow-hidden rounded-xl border border-border/70 bg-muted transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="relative aspect-[3/4] overflow-hidden"><img src={page} alt={`第 ${index + 1} 页预览`} loading="lazy" className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.035]" /><span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur">{index + 1}</span></div></a>)}</div> : <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">暂无页面预览</div>}</section>;
}

function readerUrl(id: string, page: number): string {
  return `/reader/nhentai/${encodeURIComponent(id)}?page=${page}`;
}

function playerUrl(id: string): string {
  return `/player/hanime1/${encodeURIComponent(id)}`;
}

function loadItems(sourceId: SourceId, query: string, cursor?: string, signal?: AbortSignal) {
  if (sourceId === 'nhentai') return loadNhentaiItems(query, cursor, signal);
  if (sourceId === 'hanime1') return loadHanime1Items(query, cursor, signal);
  return Promise.reject(new Error(`${sourceOptions.find((source) => source.id === sourceId)?.name ?? sourceId} 尚未接入`));
}

function detailPlaceholder(id: string, source: string | null): ContentItem {
  const video = source === 'hanime1';
  return { id, sourceId: video ? 'hanime1' : 'nhentai', sourceName: video ? 'hanime1.me' : 'nhentai', kind: video ? 'video' : 'comic', title: video ? '正在载入动漫详情' : '正在载入漫画详情', subtitle: '', coverUrl: '', tags: [], progress: 0, progressLabel: '' };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '真实来源加载失败';
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-destructive/25 bg-destructive/8 p-4 sm:flex-row sm:items-center"><AlertCircle className="size-5 shrink-0 text-destructive" /><div className="min-w-0 flex-1"><p className="font-medium">真实来源暂时不可用</p><p className="mt-1 break-words text-xs text-muted-foreground">{message}</p></div><Button variant="outline" size="sm" className="rounded-lg" onClick={onRetry}><RefreshCw />重试</Button></div>;
}

function EmptyState({ video, favorites = false }: { video: boolean; favorites?: boolean }) {
  return <div className="grid min-h-56 place-items-center rounded-3xl border border-dashed border-border bg-card/30 text-center"><div>{favorites ? <Heart className="mx-auto mb-3 size-6 text-muted-foreground" /> : <Search className="mx-auto mb-3 size-6 text-muted-foreground" />}<p className="font-medium">{favorites ? '还没有收藏漫画' : video ? '没有找到匹配动漫' : '没有找到匹配内容'}</p><p className="mt-1 text-sm text-muted-foreground">{favorites ? '在漫画卡片或详情页点击心形按钮即可收藏。' : '换一个关键词试试。'}</p></div></div>;
}

function InfiniteScrollSentinel({ enabled, loading, onVisible }: { enabled: boolean; loading: boolean; onVisible: () => void }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled || loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      onVisible();
    }, { rootMargin: '600px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, loading, onVisible]);

  if (!enabled && !loading) return null;
  return <div ref={sentinelRef} aria-live="polite" className="grid min-h-24 place-items-center py-6">{loading ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin text-primary" />正在加载更多</div> : <span className="sr-only">继续滚动以加载更多内容</span>}</div>;
}

function LoadingGrid({ count = PAGE_SIZE }: { count?: number }) {
  return <div className="content-grid" aria-label="正在加载内容">{Array.from({ length: count }, (_, index) => <div key={index} className="animate-pulse"><div className="aspect-[3/4] rounded-xl bg-muted" /><div className="mt-3 h-4 rounded bg-muted" /><div className="mt-2 h-3 w-2/3 rounded bg-muted" /></div>)}</div>;
}
