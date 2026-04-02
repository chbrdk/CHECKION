/**
 * URL safety helpers for server-side fetching.
 *
 * Goal: reduce SSRF risk by blocking obvious local/private targets at input validation time.
 * Note: This does NOT perform DNS resolution. It is a fast syntactic/host-based guardrail.
 */

function isPrivateIpv4(host: string): boolean {
  // host is expected to be a plain IPv4 literal (no port)
  const parts = host.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isIPv4Literal(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * Returns false for localhost/private network targets.
 */
export function isSafeUrlForServerFetch(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === 'localhost.localdomain') return false;
  if (host.endsWith('.localhost')) return false;
  if (host === '::1') return false;
  if (isIPv4Literal(host) && isPrivateIpv4(host)) return false;
  return true;
}

