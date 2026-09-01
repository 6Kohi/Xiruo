import { assertAllowedSourceUrl } from './source-policy';

export interface ProxyTokenPayload {
  sourceId: string;
  url: string;
  expiresAt: number;
  headers?: Record<string, string>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signProxyToken(payload: ProxyTokenPayload, secret: string): Promise<string> {
  if (secret.length < 32) throw new Error('Proxy secret must be at least 32 characters');
  assertAllowedSourceUrl(payload.sourceId, payload.url);
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await importKey(secret), encoder.encode(encodedPayload));
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyProxyToken(token: string, secret: string, now = Date.now()): Promise<ProxyTokenPayload> {
  if (secret.length < 32) throw new Error('Proxy secret must be at least 32 characters');
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra !== undefined) throw new Error('Invalid proxy token');
  const valid = await crypto.subtle.verify('HMAC', await importKey(secret), base64UrlToBytes(encodedSignature), encoder.encode(encodedPayload));
  if (!valid) throw new Error('Invalid proxy token signature');

  let payload: ProxyTokenPayload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlToBytes(encodedPayload))) as ProxyTokenPayload;
  } catch {
    throw new Error('Invalid proxy token payload');
  }
  if (!payload.sourceId || !payload.url || !Number.isFinite(payload.expiresAt)) throw new Error('Invalid proxy token payload');
  if (payload.expiresAt <= now) throw new Error('Proxy token expired');
  assertAllowedSourceUrl(payload.sourceId, payload.url);
  return payload;
}
