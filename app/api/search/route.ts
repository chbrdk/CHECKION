/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/search (dashboard search over scans)          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { auth } from '@/auth';
import { listCachedStandaloneScans, listCachedDomainScans } from '@/lib/cache';
import { listScansByGroupId } from '@/lib/db/scans';
import { hasStoredAggregated } from '@/lib/domain-summary';
import type { ScanResult, SearchMatch, SearchMatchType } from '@/lib/types';
import { CACHE_REVALIDATE_LIST } from '@/lib/constants';

const MAX_SINGLE_LOAD = 300;
const MAX_DOMAIN_LOAD = 30;
const MAX_MATCHES = 100;

function containsQuery(text: string | null | undefined, q: string): boolean {
    if (text == null || typeof text !== 'string') return false;
    return text.toLowerCase().includes(q);
}

function snippet(str: string, maxLen: number): string {
    const s = str.trim();
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen).trim() + '…';
}

function searchInScan(
    result: ScanResult,
    q: string,
    type: 'single' | 'domain',
    scanId: string,
    domain?: string
): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const seen = new Set<string>();

    const add = (matchType: SearchMatchType, snippetText: string) => {
        const key = `${result.url}\t${matchType}\t${snippetText.slice(0, 50)}`;
        if (seen.has(key)) return;
        seen.add(key);
        matches.push({
            type,
            id: scanId,
            url: result.url,
            domain,
            snippet: snippet(snippetText, 120),
            matchType,
            timestamp: result.timestamp,
            score: result.score,
        });
    };

    if (containsQuery(result.url, q)) add('url', result.url);

    result.pageIndex?.regions?.forEach((r) => {
        if (containsQuery(r.headingText, q)) add('region', r.headingText || r.tag);
        if (containsQuery(r.semanticType, q)) add('region', `${r.tag}: ${r.semanticType}`);
    });

    result.issues?.forEach((i) => {
        if (containsQuery(i.message, q)) add('issue', i.message);
        if (containsQuery(i.code, q)) add('issue', i.code + ' – ' + i.message);
    });

    if (result.seo) {
        if (containsQuery(result.seo.title, q)) add('seo', result.seo.title ?? '');
        if (containsQuery(result.seo.metaDescription, q)) add('seo', result.seo.metaDescription ?? '');
        if (containsQuery(result.seo.h1, q)) add('seo', result.seo.h1 ?? '');
    }

    if (domain && containsQuery(domain, q)) add('domain', domain);

    return matches;
}

async function runSearch(
    userId: string,
    q: string,
    typeFilter: 'single' | 'domain' | 'all',
    limit: number
): Promise<SearchMatch[]> {
    const allMatches: SearchMatch[] = [];

    if (typeFilter === 'all' || typeFilter === 'single') {
        const singleScans = await listCachedStandaloneScans(userId, { limit: MAX_SINGLE_LOAD });
        for (const result of singleScans) {
            const list = searchInScan(result, q, 'single', result.id);
            for (const m of list) {
                if (allMatches.length >= limit) break;
                allMatches.push(m);
            }
            if (allMatches.length >= limit) break;
        }
    }

    if ((typeFilter === 'all' || typeFilter === 'domain') && allMatches.length < limit) {
        const domainScans = await listCachedDomainScans(userId, { limit: MAX_DOMAIN_LOAD });
        for (const ds of domainScans) {
            if (allMatches.length >= limit) break;
            const domain = ds.domain;
            const pagesToSearch = hasStoredAggregated(ds)
                ? await listScansByGroupId(userId, ds.id)
                : (ds.pages ?? []) as ScanResult[];
            for (const page of pagesToSearch) {
                if (allMatches.length >= limit) break;
                const list = searchInScan(page, q, 'domain', ds.id, domain);
                for (const m of list) {
                    if (allMatches.length >= limit) break;
                    allMatches.push(m);
                }
            }
        }
    }

    return allMatches.slice(0, Math.min(limit, MAX_MATCHES));
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    if (!q) {
        return NextResponse.json({ matches: [] });
    }

    const typeParam = searchParams.get('type') ?? 'all';
    const typeFilter = typeParam === 'single' ? 'single' : typeParam === 'domain' ? 'domain' : 'all';
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));

    const getCachedSearch = unstable_cache(
        () => runSearch(session.user.id, q, typeFilter, limit),
        ['search', session.user.id, q, typeFilter, String(limit)],
        { revalidate: CACHE_REVALIDATE_LIST, tags: [`scans-list-${session.user.id}`, `domain-list-${session.user.id}`] }
    );

    const capped = await getCachedSearch();
    return NextResponse.json({ matches: capped });
}
