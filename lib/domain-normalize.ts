/**
 * Normalize domain string to a canonical hostname for deduplication and lookup.
 * Used for project competitors and domain_scan lookups.
 */
export function normalizeDomain(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    return url.hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, '').split('/')[0] ?? trimmed;
  }
}
