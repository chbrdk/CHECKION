/** Normalized hostname for rank tracking from project company URL/domain. */
export function projectTrackDomain(domain: string | null | undefined): string | null {
    if (!domain?.trim()) return null;
    const host = domain
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('/')[0]
        ?.trim();
    return host || null;
}
