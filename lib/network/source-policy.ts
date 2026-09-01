export interface SourcePolicy {
  id: string;
  hosts: string[];
}

const sourcePolicies: Record<string, SourcePolicy> = {
  picacg: { id: 'picacg', hosts: ['picaapi.picacomic.com', 'picacomic.com'] },
  nhentai: { id: 'nhentai', hosts: ['nhentai.net'] },
  ehentai: { id: 'ehentai', hosts: ['e-hentai.org', 'exhentai.org', 'ehgt.org'] },
  hanime1: { id: 'hanime1', hosts: ['hanime1.me', 'vdownload.hembed.com'] },
};

export class SourcePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourcePolicyError';
  }
}

function normalizedHostname(hostname: string): string {
  return hostname.toLocaleLowerCase().replace(/\.$/, '');
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((part) => part > 255)) return true;
  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLocaleLowerCase();
  return host === '::' || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || /^fe[89ab]/.test(host) || host.startsWith('::ffff:127.') || host.startsWith('::ffff:10.') || host.startsWith('::ffff:192.168.');
}

function hostMatches(hostname: string, allowedHost: string): boolean {
  return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
}

export function getSourcePolicy(sourceId: string): SourcePolicy {
  const policy = sourcePolicies[sourceId];
  if (!policy) throw new SourcePolicyError(`Unknown source policy: ${sourceId}`);
  return policy;
}

export function assertAllowedSourceUrl(sourceId: string, rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SourcePolicyError('Invalid source URL');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new SourcePolicyError('Only HTTP and HTTPS URLs are allowed');
  }
  if (url.username || url.password) throw new SourcePolicyError('URL credentials are not allowed');

  const hostname = normalizedHostname(url.hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    throw new SourcePolicyError('Private and local network addresses are blocked');
  }

  const policy = getSourcePolicy(sourceId);
  if (!policy.hosts.some((host) => hostMatches(hostname, host))) {
    throw new SourcePolicyError(`Host is not allowed for source ${sourceId}`);
  }

  return url;
}
