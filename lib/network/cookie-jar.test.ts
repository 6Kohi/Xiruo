import { describe, expect, it } from 'vitest';

import { MemoryCookieJar } from './cookie-jar';

describe('MemoryCookieJar', () => {
  it('keeps cookies isolated by source', () => {
    const jar = new MemoryCookieJar();
    jar.setCookie('nhentai', 'https://nhentai.net/login', 'session=secret; Path=/; Secure; HttpOnly');
    expect(jar.getCookieHeader('nhentai', 'https://nhentai.net/g/1')).toBe('session=secret');
    expect(jar.getCookieHeader('ehentai', 'https://nhentai.net/g/1')).toBe('');
  });

  it('honors host, domain, path, and secure scope', () => {
    const jar = new MemoryCookieJar();
    jar.setCookie('nhentai', 'https://nhentai.net/account/login', 'host=1');
    jar.setCookie('nhentai', 'https://nhentai.net/account/login', 'domain=1; Domain=.nhentai.net; Path=/; Secure');
    expect(jar.getCookieHeader('nhentai', 'https://i3.nhentai.net/image')).toBe('domain=1');
    expect(jar.getCookieHeader('nhentai', 'http://nhentai.net/account/profile')).toBe('host=1');
  });

  it('rejects cookies attempting to escape their response domain', () => {
    const jar = new MemoryCookieJar();
    jar.setCookie('nhentai', 'https://nhentai.net/', 'session=bad; Domain=attacker.example');
    expect(jar.exportSource('nhentai')).toEqual([]);
  });

  it('expires and deletes cookies', () => {
    const now = 1_000_000;
    const jar = new MemoryCookieJar();
    jar.setCookie('nhentai', 'https://nhentai.net/', 'short=1; Max-Age=1', now);
    expect(jar.getCookieHeader('nhentai', 'https://nhentai.net/', now + 500)).toBe('short=1');
    expect(jar.getCookieHeader('nhentai', 'https://nhentai.net/', now + 1_500)).toBe('');
  });
});
