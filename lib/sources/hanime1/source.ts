import * as cheerio from 'cheerio';

import { SourceHttpClient } from '../../network/source-http-client';
import type { SourceFetchResult } from '../../network/safe-fetch';
import type { ContentDetails, ContentItem, PageResult, PlaybackInfo, SourceContext, VideoSource } from '../contracts';

type SourceTransport = Pick<SourceHttpClient, 'request'>;

const baseUrl = 'https://hanime1.me';

export class Hanime1Source implements VideoSource {
  readonly id = 'hanime1';
  readonly name = 'hanime1.me';
  readonly #transport: SourceTransport;

  constructor(transport: SourceTransport = new SourceHttpClient()) {
    this.#transport = transport;
  }

  async explore(cursor: string | undefined, context: SourceContext): Promise<PageResult<ContentItem>> {
    const page = parsePage(cursor);
    const url = new URL('/search', baseUrl);
    url.searchParams.set('sort', '最新上傳');
    url.searchParams.set('page', String(page));
    return this.#loadList(url.toString(), page, context);
  }

  async search(keyword: string, cursor: string | undefined, context: SourceContext): Promise<PageResult<ContentItem>> {
    const query = keyword.trim();
    if (!query) return { items: [] };
    const page = parsePage(cursor);
    const url = new URL('/search', baseUrl);
    url.searchParams.set('query', query);
    url.searchParams.set('page', String(page));
    return this.#loadList(url.toString(), page, context);
  }

  async getDetails(rawId: string, context: SourceContext): Promise<ContentDetails> {
    const id = normalizeId(rawId);
    const html = await this.#requestHtml(`${baseUrl}/watch?v=${encodeURIComponent(id)}`, context);
    const $ = cheerio.load(html);
    const title = firstText($, ['meta[property="og:title"]', 'h1', '.video-title', 'title']) || id;
    const description = attribute($, 'meta[property="og:description"]', 'content') || firstText($, ['.video-description', '.description', '[itemprop="description"]']);
    const coverUrl = absoluteMediaUrl(attribute($, 'meta[property="og:image"]', 'content') || attribute($, 'video', 'poster') || attribute($, 'img', 'src'));
    const tags = unique($('a[href*="genre"], a[href*="tag"]').map((_index, element) => $(element).text().trim()).get().filter(Boolean));

    return {
      id,
      sourceId: this.id,
      sourceName: this.name,
      kind: 'video',
      title,
      subtitle: firstText($, ['.video-duration', '[itemprop="duration"]']),
      coverUrl,
      tags,
      progress: 0,
      progressLabel: '',
      description,
      creators: [],
      entries: [{ id, title: '播放', order: 1 }],
    };
  }

  async resolvePlayback(rawId: string, context: SourceContext): Promise<PlaybackInfo> {
    const id = normalizeId(rawId);
    const html = await this.#requestHtml(`${baseUrl}/watch?v=${encodeURIComponent(id)}`, context);
    const $ = cheerio.load(html);
    const candidates = [
      $('video source').first().attr('src'),
      $('video').first().attr('src'),
      attribute($, 'meta[property="og:video"]', 'content'),
      ...extractScriptMediaUrls(html),
    ].filter((value): value is string => Boolean(value));
    const url = candidates.map((candidate) => safePlaybackUrl(candidate)).find(Boolean);
    if (!url) throw new Error('hanime1 playback URL was not found');

    return {
      url,
      type: /\.m3u8(?:$|\?)/i.test(url) ? 'hls' : /\.mpd(?:$|\?)/i.test(url) ? 'dash' : 'file',
      headers: { referer: `${baseUrl}/` },
    };
  }

  async #loadList(url: string, page: number, context: SourceContext): Promise<PageResult<ContentItem>> {
    const html = await this.#requestHtml(url, context);
    const $ = cheerio.load(html);
    const items = new Map<string, ContentItem>();

    $('a[href*="/watch?v="]').each((_index, element) => {
      const link = $(element);
      const href = link.attr('href');
      if (!href) return;
      const id = new URL(href, baseUrl).searchParams.get('v');
      if (!id || items.has(id)) return;
      const card = link.closest('article, .card, .video-item, .col, li, div');
      const title = link.attr('title')?.trim() || card.find('[title]').first().attr('title')?.trim() || card.find('h2, h3, h4, h5, .title').first().text().trim() || link.text().trim();
      if (!title) return;
      const image = card.find('img').first();
      const coverUrl = absoluteMediaUrl(image.attr('data-src') || image.attr('data-original') || image.attr('src'));
      const subtitle = card.find('.duration, time, .text-muted, small').first().text().trim();
      items.set(id, { id, sourceId: this.id, sourceName: this.name, kind: 'video', title, subtitle, coverUrl, tags: [], progress: 0, progressLabel: '' });
    });

    const hasNextPage = $('a[href]').toArray().some((element) => {
      const link = $(element);
      if (link.attr('rel') === 'next' || link.is('.pagination .next:not(.disabled)')) return true;
      try {
        return new URL(link.attr('href') ?? '', baseUrl).searchParams.get('page') === String(page + 1);
      } catch {
        return false;
      }
    });
    return { items: [...items.values()].slice(0, 25), nextCursor: hasNextPage ? String(page + 1) : undefined };
  }

  async #requestHtml(url: string, context: SourceContext): Promise<string> {
    const response = await this.#transport.request(url, {
      sourceId: this.id,
      signal: context.signal,
      headers: { accept: 'text/html,application/xhtml+xml', 'accept-language': context.locale, 'user-agent': 'Mozilla/5.0 (compatible; Xiruo/0.1; private-use)' },
      maxBytes: 5 * 1024 * 1024,
    });
    assertSuccessful(response);
    return new TextDecoder().decode(response.body);
  }
}

function firstText($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const element = $(selector).first();
    const value = element.is('meta') ? element.attr('content') : element.text();
    if (value?.trim()) return value.trim();
  }
  return '';
}

function attribute($: cheerio.CheerioAPI, selector: string, name: string): string {
  return $(selector).first().attr(name)?.trim() ?? '';
}

function absoluteMediaUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl, baseUrl).toString();
  } catch {
    return '';
  }
}

function safePlaybackUrl(rawUrl: string): string | undefined {
  const decoded = rawUrl.replaceAll('\\/', '/').replaceAll('&amp;', '&').trim();
  try {
    const url = new URL(decoded, baseUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    const hostname = url.hostname.toLocaleLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local') || /^(?:127|10|0|169\.254|192\.168)\./.test(hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function extractScriptMediaUrls(html: string): string[] {
  const matches = html.matchAll(/(?:src|file|videoUrl)["']?\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mpd)(?:\?[^"']*)?)["']/gi);
  return [...matches].map((match) => match[1]);
}

function normalizeId(rawId: string): string {
  const trimmed = rawId.trim();
  const fromUrl = trimmed.includes('?') ? new URL(trimmed, baseUrl).searchParams.get('v') ?? '' : trimmed.replace(/^hanime1:/i, '');
  if (!fromUrl || !/^[\w-]+$/.test(fromUrl)) throw new Error('Invalid hanime1 video id');
  return fromUrl;
}

function parsePage(cursor: string | undefined): number {
  const page = Number(cursor ?? '1');
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function assertSuccessful(response: SourceFetchResult): void {
  if (response.status === 200) return;
  if (response.status === 403) throw new Error('hanime1 access was blocked by source protection');
  if (response.status === 429) throw new Error('hanime1 rate limit reached');
  throw new Error(`hanime1 request failed with HTTP ${response.status}`);
}
