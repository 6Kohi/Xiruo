import { describe, expect, it } from 'vitest';

import { assertAllowedSourceUrl } from './source-policy';

describe('assertAllowedSourceUrl', () => {
  it('allows exact and subdomain source hosts', () => {
    expect(assertAllowedSourceUrl('nhentai', 'https://nhentai.net/g/1').hostname).toBe('nhentai.net');
    expect(assertAllowedSourceUrl('nhentai', 'https://i3.nhentai.net/galleries/1/1.jpg').hostname).toBe('i3.nhentai.net');
  });

  it.each([
    'http://127.0.0.1/admin',
    'http://10.0.0.5/',
    'http://192.168.1.2/',
    'http://[::1]/',
    'file:///etc/passwd',
  ])('blocks local or non-http target %s', (url) => {
    expect(() => assertAllowedSourceUrl('nhentai', url)).toThrow();
  });

  it('blocks cross-source and suffix-confusion hosts', () => {
    expect(() => assertAllowedSourceUrl('nhentai', 'https://e-hentai.org/')).toThrow('not allowed');
    expect(() => assertAllowedSourceUrl('nhentai', 'https://nhentai.net.attacker.example/')).toThrow('not allowed');
  });

  it('rejects unknown source ids and embedded credentials', () => {
    expect(() => assertAllowedSourceUrl('unknown', 'https://example.com')).toThrow('Unknown source');
    expect(() => assertAllowedSourceUrl('nhentai', 'https://user:pass@nhentai.net')).toThrow('credentials');
  });
});
