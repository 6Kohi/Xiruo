import { SourceHttpClient } from '../../network/source-http-client';
import type { SourceFetchResult } from '../../network/safe-fetch';
import type { ComicSource, ContentDetails, ContentItem, PageResult, SourceContext } from '../contracts';

interface NhentaiTag {
  id?: number;
  name?: string;
  slug?: string;
  type?: string;
}

interface NhentaiGallerySummary {
  id: number | string;
  english_title?: string;
  japanese_title?: string;
  thumbnail?: string | { path?: string };
  tag_ids?: number[];
  tags?: NhentaiTag[];
  num_pages?: number;
}

interface NhentaiGalleryPage {
  path?: string;
  thumbnail?: string;
}

interface NhentaiGalleryDetails extends NhentaiGallerySummary {
  title?: { pretty?: string; english?: string; japanese?: string };
  cover?: { path?: string };
  pages?: NhentaiGalleryPage[];
  upload_date?: number;
}

interface NhentaiListResponse {
  result?: NhentaiGallerySummary[];
  num_pages?: number;
}

type SourceTransport = Pick<SourceHttpClient, 'request'>;

const languageTagNames: Record<number, string> = {
  12227: 'English',
  6346: '日本語',
  29963: '中文',
};

export class NhentaiSource implements ComicSource {
  readonly id = 'nhentai';
  readonly name = 'nhentai';
  readonly #apiBaseUrl = 'https://nhentai.net/api/v2';
  readonly #transport: SourceTransport;

  constructor(transport: SourceTransport = new SourceHttpClient()) {
    this.#transport = transport;
  }

  async explore(cursor: string | undefined, context: SourceContext): Promise<PageResult<ContentItem>> {
    const page = parsePage(cursor);
    const data = await this.#requestJson<NhentaiListResponse>(`${this.#apiBaseUrl}/galleries?page=${page}`, context);
    return this.#parseList(data, page);
  }

  async search(keyword: string, cursor: string | undefined, context: SourceContext): Promise<PageResult<ContentItem>> {
    const query = keyword.trim();
    if (!query) return { items: [] };
    const page = parsePage(cursor);
    const url = new URL(`${this.#apiBaseUrl}/search`);
    url.searchParams.set('query', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'date');
    const data = await this.#requestJson<NhentaiListResponse>(url.toString(), context);
    return this.#parseList(data, page);
  }

  async getDetails(rawId: string, context: SourceContext): Promise<ContentDetails> {
    const id = normalizeId(rawId);
    const data = await this.#requestJson<NhentaiGalleryDetails>(`${this.#apiBaseUrl}/galleries/${id}?include=related,favorite`, context);
    const item = this.#parseItem(data);
    const creatorTags = (data.tags ?? []).filter((tag) => ['artist', 'group'].includes(tag.type?.toLocaleLowerCase() ?? '')).map((tag) => tag.name).filter((name): name is string => Boolean(name));

    return {
      ...item,
      description: `Gallery ${id} · ${data.num_pages ?? data.pages?.length ?? 0} pages`,
      creators: creatorTags,
      entries: [{ id: 'default', title: '全部页面', order: 1 }],
    };
  }

  async getChapter(rawId: string, _chapterId: string, context: SourceContext): Promise<string[]> {
    const id = normalizeId(rawId);
    const data = await this.#requestJson<NhentaiGalleryDetails>(`${this.#apiBaseUrl}/galleries/${id}`, context);
    return (data.pages ?? []).map((page) => toMediaUrl(page.path ?? '', false)).filter(Boolean);
  }

  #parseList(data: NhentaiListResponse, page: number): PageResult<ContentItem> {
    const maxPage = Math.max(1, Number(data.num_pages) || 1);
    return {
      items: (data.result ?? []).map((gallery) => this.#parseItem(gallery)),
      nextCursor: page < maxPage ? String(page + 1) : undefined,
    };
  }

  #parseItem(gallery: NhentaiGallerySummary): ContentItem {
    const id = String(gallery.id);
    const thumbnail = typeof gallery.thumbnail === 'string' ? gallery.thumbnail : gallery.thumbnail?.path ?? '';
    const tagNames = (gallery.tags ?? []).map((tag) => tag.name).filter((name): name is string => Boolean(name));
    const language = (gallery.tag_ids ?? []).map((tagId) => languageTagNames[tagId]).find(Boolean);
    if (language && !tagNames.includes(language)) tagNames.push(language);

    return {
      id,
      sourceId: this.id,
      sourceName: this.name,
      kind: 'comic',
      title: getTitle(gallery),
      subtitle: `${gallery.num_pages ?? 0} 页`,
      coverUrl: toMediaUrl(thumbnail, true),
      tags: tagNames,
      progress: 0,
      progressLabel: '',
    };
  }

  async #requestJson<T>(url: string, context: SourceContext): Promise<T> {
    const response = await this.#transport.request(url, {
      sourceId: this.id,
      signal: context.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'Xiruo/0.1 (+private-use)',
      },
      maxBytes: 4 * 1024 * 1024,
    });
    assertSuccessful(response);
    try {
      return JSON.parse(new TextDecoder().decode(response.body)) as T;
    } catch {
      throw new Error('nhentai returned invalid JSON');
    }
  }
}

function getTitle(gallery: NhentaiGallerySummary | NhentaiGalleryDetails): string {
  const details = gallery as NhentaiGalleryDetails;
  return details.title?.pretty || details.title?.english || gallery.english_title || gallery.japanese_title || String(gallery.id);
}

function parsePage(cursor: string | undefined): number {
  if (!cursor) return 1;
  const page = Number(cursor);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function normalizeId(rawId: string): string {
  const id = rawId.replace(/^nhentai/i, '').replace(/^nh/i, '');
  if (!/^\d+$/.test(id)) throw new Error('Invalid nhentai gallery id');
  return id;
}

function toMediaUrl(rawPath: string, thumbnail: boolean): string {
  if (!rawPath) return '';
  let path = rawPath.replace(/(\.(?:jpg|png|webp|gif))+/gi, (match) => match.match(/\.(?:jpg|png|webp|gif)/i)?.[0] ?? match);
  if (path.startsWith('//')) path = `https:${path}`;
  if (/^https?:\/\//i.test(path)) {
    if (thumbnail || path.includes('/cover.')) return path.replace(/https?:\/\/[it]\d\.nhentai\.net/i, 'https://t3.nhentai.net');
    return path;
  }
  path = path.replace(/^\/+/, '');
  return `${thumbnail ? 'https://t3.nhentai.net' : 'https://i3.nhentai.net'}/${path}`;
}

function assertSuccessful(response: SourceFetchResult): void {
  if (response.status === 200) return;
  if (response.status === 401) throw new Error('nhentai authentication is required');
  if (response.status === 429) throw new Error('nhentai rate limit reached');
  throw new Error(`nhentai request failed with HTTP ${response.status}`);
}
