export interface StoredCookie {
  sourceId: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expiresAt?: number;
  hostOnly: boolean;
}

function defaultPath(pathname: string): string {
  if (!pathname.startsWith('/') || pathname === '/') return '/';
  const lastSlash = pathname.lastIndexOf('/');
  return lastSlash <= 0 ? '/' : pathname.slice(0, lastSlash);
}

function domainMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function pathMatches(requestPath: string, cookiePath: string): boolean {
  return requestPath === cookiePath || requestPath.startsWith(cookiePath.endsWith('/') ? cookiePath : `${cookiePath}/`);
}

export class MemoryCookieJar {
  readonly #cookies = new Map<string, StoredCookie>();

  setCookie(sourceId: string, responseUrl: string, setCookieValue: string, now = Date.now()): void {
    const url = new URL(responseUrl);
    const parts = setCookieValue.split(';').map((part) => part.trim());
    const [nameValue, ...attributes] = parts;
    const separator = nameValue.indexOf('=');
    if (separator <= 0) return;

    const name = nameValue.slice(0, separator).trim();
    const value = nameValue.slice(separator + 1).trim();
    let domain = url.hostname.toLocaleLowerCase();
    let path = defaultPath(url.pathname);
    let secure = false;
    let httpOnly = false;
    let expiresAt: number | undefined;
    let hostOnly = true;

    for (const attribute of attributes) {
      const [rawName, ...rawValue] = attribute.split('=');
      const attributeName = rawName.toLocaleLowerCase();
      const attributeValue = rawValue.join('=').trim();
      if (attributeName === 'domain' && attributeValue) {
        const candidate = attributeValue.replace(/^\./, '').toLocaleLowerCase();
        if (!domainMatches(url.hostname.toLocaleLowerCase(), candidate)) return;
        domain = candidate;
        hostOnly = false;
      } else if (attributeName === 'path' && attributeValue.startsWith('/')) {
        path = attributeValue;
      } else if (attributeName === 'secure') {
        secure = true;
      } else if (attributeName === 'httponly') {
        httpOnly = true;
      } else if (attributeName === 'max-age') {
        const seconds = Number(attributeValue);
        if (Number.isFinite(seconds)) expiresAt = now + seconds * 1000;
      } else if (attributeName === 'expires' && expiresAt === undefined) {
        const timestamp = Date.parse(attributeValue);
        if (Number.isFinite(timestamp)) expiresAt = timestamp;
      }
    }

    const key = this.#key(sourceId, domain, path, name);
    if (expiresAt !== undefined && expiresAt <= now) {
      this.#cookies.delete(key);
      return;
    }
    this.#cookies.set(key, { sourceId, name, value, domain, path, secure, httpOnly, expiresAt, hostOnly });
  }

  getCookieHeader(sourceId: string, requestUrl: string, now = Date.now()): string {
    const url = new URL(requestUrl);
    const hostname = url.hostname.toLocaleLowerCase();
    const pairs: string[] = [];

    for (const [key, cookie] of this.#cookies) {
      if (cookie.expiresAt !== undefined && cookie.expiresAt <= now) {
        this.#cookies.delete(key);
        continue;
      }
      if (cookie.sourceId !== sourceId) continue;
      if (cookie.secure && url.protocol !== 'https:') continue;
      if (cookie.hostOnly ? hostname !== cookie.domain : !domainMatches(hostname, cookie.domain)) continue;
      if (!pathMatches(url.pathname || '/', cookie.path)) continue;
      pairs.push(`${cookie.name}=${cookie.value}`);
    }

    return pairs.join('; ');
  }

  clearSource(sourceId: string): void {
    for (const [key, cookie] of this.#cookies) {
      if (cookie.sourceId === sourceId) this.#cookies.delete(key);
    }
  }

  exportSource(sourceId: string): StoredCookie[] {
    return [...this.#cookies.values()].filter((cookie) => cookie.sourceId === sourceId).map((cookie) => ({ ...cookie }));
  }

  #key(sourceId: string, domain: string, path: string, name: string): string {
    return `${sourceId}\n${domain}\n${path}\n${name}`;
  }
}
