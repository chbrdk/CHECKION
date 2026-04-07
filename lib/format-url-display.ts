/**
 * URL für kompakte Listen: Host + Pfad, gekürzt (ohne Protokoll).
 */
export function formatUrlForList(raw: string, maxLength = 64): string {
    try {
        const u = new URL(raw);
        const host = u.host.replace(/^www\./, '');
        const path = `${u.pathname}${u.search}${u.hash}` || '/';
        const combined = `${host}${path}`;
        if (combined.length <= maxLength) return combined;
        return `${combined.slice(0, Math.max(1, maxLength - 1))}…`;
    } catch {
        if (raw.length <= maxLength) return raw;
        return `${raw.slice(0, Math.max(1, maxLength - 1))}…`;
    }
}
