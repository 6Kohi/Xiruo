import { describe, expect, it } from 'vitest';

import { signProxyToken, verifyProxyToken } from './proxy-token';

const secret = 'test-secret-that-is-longer-than-thirty-two-characters';

describe('proxy tokens', () => {
  it('round-trips an allowed short-lived payload', async () => {
    const payload = { sourceId: 'nhentai', url: 'https://i3.nhentai.net/image.jpg', expiresAt: 2_000_000 };
    const token = await signProxyToken(payload, secret);
    await expect(verifyProxyToken(token, secret, 1_000_000)).resolves.toEqual(payload);
  });

  it('rejects tampering, expiry, and disallowed targets', async () => {
    const token = await signProxyToken({ sourceId: 'nhentai', url: 'https://nhentai.net/image.jpg', expiresAt: 2_000_000 }, secret);
    await expect(verifyProxyToken(`${token}x`, secret, 1_000_000)).rejects.toThrow();
    await expect(verifyProxyToken(token, secret, 3_000_000)).rejects.toThrow('expired');
    await expect(signProxyToken({ sourceId: 'nhentai', url: 'http://127.0.0.1/secret', expiresAt: 2_000_000 }, secret)).rejects.toThrow('blocked');
  });

  it('requires a strong signing secret', async () => {
    await expect(signProxyToken({ sourceId: 'nhentai', url: 'https://nhentai.net/x', expiresAt: 2_000_000 }, 'short')).rejects.toThrow('32');
  });
});
