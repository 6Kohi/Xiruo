import { MemoryCookieJar } from './cookie-jar';
import { fetchSource, type SourceFetchOptions, type SourceFetchResult } from './safe-fetch';

type ClientRequestOptions = Omit<SourceFetchOptions, 'beforeRequest' | 'onResponse'>;

function getSetCookieValues(headers: Headers): string[] {
  const extendedHeaders = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof extendedHeaders.getSetCookie === 'function') return extendedHeaders.getSetCookie();
  const value = headers.get('set-cookie');
  return value ? [value] : [];
}

export class SourceHttpClient {
  constructor(readonly cookieJar = new MemoryCookieJar()) {}

  async request(rawUrl: string, options: ClientRequestOptions): Promise<SourceFetchResult> {
    return fetchSource(rawUrl, {
      ...options,
      beforeRequest: (url, headers) => {
        const cookie = this.cookieJar.getCookieHeader(options.sourceId, url.toString());
        if (cookie) headers.set('cookie', cookie);
      },
      onResponse: (response, url) => {
        for (const setCookie of getSetCookieValues(response.headers)) {
          this.cookieJar.setCookie(options.sourceId, url.toString(), setCookie);
        }
      },
    });
  }
}
