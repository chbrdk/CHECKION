import { PATH_DOMAIN } from '@/lib/constants';

/** URL segment after `/domain/[id]/` for each theme (not including overview). */
export const DOMAIN_RESULT_NAV_SLUGS = [
    'visual-map',
    'list-details',
    'ux-cx',
    'visual-analysis',
    'ux-audit',
    'structure',
    'links-seo',
    'infra',
    'generative',
    'journey',
] as const;

export type DomainResultNavSlug = (typeof DOMAIN_RESULT_NAV_SLUGS)[number];

/** Logical section including overview (no extra path segment). */
export type DomainResultSectionSlug = 'overview' | DomainResultNavSlug;

/** Build app route: `/domain/[id]` or `/domain/[id]/[section]` with optional query (restoreJourney, issue filters). */
export function pathDomainSection(
    id: string,
    section: DomainResultSectionSlug,
    query?: Record<string, string>
): string {
    const base = `${PATH_DOMAIN}/${encodeURIComponent(id)}`;
    const path = section === 'overview' ? base : `${base}/${section}`;
    if (query && Object.keys(query).length) {
        return `${path}?${new URLSearchParams(query).toString()}`;
    }
    return path;
}

const NAV_SET = new Set<string>(DOMAIN_RESULT_NAV_SLUGS);

export function getDomainSectionFromPathname(pathname: string, id: string): DomainResultSectionSlug {
    const prefix = `${PATH_DOMAIN}/${encodeURIComponent(id)}`;
    if (pathname !== prefix && !pathname.startsWith(prefix + '/')) {
        return 'overview';
    }
    const rest = pathname.slice(prefix.length).replace(/^\//, '');
    if (!rest) return 'overview';
    const seg = rest.split('/')[0];
    if (seg && NAV_SET.has(seg)) return seg as DomainResultNavSlug;
    return 'overview';
}
