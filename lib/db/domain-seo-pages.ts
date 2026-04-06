/* Paginated PageSeoSummary rows — DB join (domain_pages + scans) or payload fallback */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainPages, scans } from '@/lib/db/schema';
import { getDomainScan } from '@/lib/db/scans';
import type { DomainScanResult } from '@/lib/types';
import { buildDomainSummary } from '@/lib/domain-summary';
import type { PageSeoSummary } from '@/lib/domain-aggregation';

export type SeoPagesSortKey = 'url' | 'wordCount';

function mapRowToPageSeoSummary(r: {
    url: string;
    title: string | null;
    hasMeta: boolean;
    hasH1: boolean;
    wordCount: number;
    topKeywordCount: number;
}): PageSeoSummary {
    const wordCount = r.wordCount;
    return {
        url: r.url,
        title: r.title,
        hasMeta: r.hasMeta,
        hasH1: r.hasH1,
        wordCount,
        topKeywordCount: r.topKeywordCount,
        isSkinny: wordCount > 0 && wordCount < 300,
    };
}

/**
 * Paged SEO rows from domain_pages + scans.result JSON (same shape as aggregateSeo per-page list).
 */
export async function listSeoPageRowsFromDb(params: {
    domainScanId: string;
    userId: string;
    offset: number;
    limit: number;
    sort: SeoPagesSortKey;
    sortDir: 'asc' | 'desc';
}): Promise<{ rows: PageSeoSummary[]; total: number }> {
    const db = getDb();
    const wordCountExpr = sql<number>`COALESCE(
        (${scans.result}->'seo'->>'bodyWordCount')::int,
        (${scans.result}->'seo'->'keywordAnalysis'->>'totalWords')::int,
        0
    )`;
    const topKwLen = sql<number>`COALESCE(jsonb_array_length(COALESCE((${scans.result}->'seo'->'keywordAnalysis'->'topKeywords')::jsonb, '[]'::jsonb)), 0)`;
    const hasMetaExpr = sql<boolean>`(COALESCE((${scans.result}->'seo'->>'metaDescription'), '')) <> ''`;
    const hasH1Expr = sql<boolean>`(COALESCE((${scans.result}->'seo'->>'h1'), '')) <> ''`;
    const titleExpr = sql<string | null>`(${scans.result}->'seo'->>'title')`;

    const where = and(eq(domainPages.domainScanId, params.domainScanId), eq(domainPages.userId, params.userId));
    const seoPresent = sql`(${scans.result}->'seo') is not null`;

    const countRows = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(domainPages)
        .innerJoin(scans, eq(scans.id, domainPages.pageScanId))
        .where(and(where, seoPresent));
    const total = Number(countRows[0]?.c ?? 0);
    if (total === 0) {
        return { rows: [], total: 0 };
    }

    const orderBy =
        params.sort === 'wordCount'
            ? params.sortDir === 'asc'
                ? asc(wordCountExpr)
                : desc(wordCountExpr)
            : params.sortDir === 'asc'
              ? asc(domainPages.url)
              : desc(domainPages.url);

    const raw = await db
        .select({
            url: domainPages.url,
            title: titleExpr,
            hasMeta: hasMetaExpr,
            hasH1: hasH1Expr,
            wordCount: wordCountExpr,
            topKeywordCount: topKwLen,
        })
        .from(domainPages)
        .innerJoin(scans, eq(scans.id, domainPages.pageScanId))
        .where(and(where, seoPresent))
        .orderBy(orderBy)
        .limit(params.limit)
        .offset(params.offset);

    return {
        rows: raw.map((x) =>
            mapRowToPageSeoSummary({
                url: x.url,
                title: x.title,
                hasMeta: Boolean(x.hasMeta),
                hasH1: Boolean(x.hasH1),
                wordCount: Number(x.wordCount ?? 0),
                topKeywordCount: Number(x.topKeywordCount ?? 0),
            })
        ),
        total,
    };
}

/** Slice precomputed aggregated.seo.pages from stored payload (legacy / no domain_pages). */
export function sliceSeoPagesFromPayload(
    scan: DomainScanResult,
    offset: number,
    limit: number,
    sort: SeoPagesSortKey,
    sortDir: 'asc' | 'desc'
): { rows: PageSeoSummary[]; total: number } {
    const summary = buildDomainSummary(scan);
    const pages = summary.aggregated?.seo?.pages ?? [];
    const total = pages.length;
    if (total === 0) return { rows: [], total: 0 };
    const sorted = [...pages].sort((a, b) => {
        let cmp = 0;
        if (sort === 'wordCount') {
            cmp = a.wordCount - b.wordCount;
        } else {
            cmp = (a.url ?? '').localeCompare(b.url ?? '');
        }
        return sortDir === 'asc' ? cmp : -cmp;
    });
    return { rows: sorted.slice(offset, offset + limit), total };
}
