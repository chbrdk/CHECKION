/**
 * Normalize URL for deduplication and fingerprint lookup (same rules as domain spider).
 */
export function normalizeScanUrl(url: string): string {
    try {
        const u = new URL(url);
        return u.origin + u.pathname.replace(/\/$/, '');
    } catch {
        return url;
    }
}
