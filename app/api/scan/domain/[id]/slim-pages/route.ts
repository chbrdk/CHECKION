/* ------------------------------------------------------------------ */
/*  GET /api/scan/domain/[id]/slim-pages — paged SlimPage[] (DB slice)   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScan } from '@/lib/db/scans';
import type { SlimSortKey } from '@/lib/db/domain-slim-pages';
import {
    countDomainPagesInDb,
    listSlimPagesFromDomainPagesTable,
    sliceSlimPagesFromPayload,
    countPayloadPages,
} from '@/lib/db/domain-slim-pages';
import { ensureDomainIssueTablesBackfilled } from '@/lib/domain-issues-backfill';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

function clampOffset(v: string | null): number {
    return Math.max(0, parseInt(v ?? '0', 10) || 0);
}

function clampLimit(v: string | null): number {
    return Math.max(1, Math.min(500, parseInt(v ?? '100', 10) || 100));
}

const SLIM_SORT_KEYS = new Set<string>(['url', 'score', 'uxScore', 'issues']);
function parseSlimSort(v: string | null): SlimSortKey {
    if (v && SLIM_SORT_KEYS.has(v)) return v as SlimSortKey;
    return 'url';
}

function parseSortDir(v: string | null): 'asc' | 'desc' {
    return v === 'desc' ? 'desc' : 'asc';
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const user = await getRequestUser(req);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const rl = checkRateLimit(`domain-slim-pages:${user.id}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const { id } = await ctx.params;
    if (!id?.trim()) return apiError('Domain scan id is required', API_STATUS.BAD_REQUEST);

    const url = new URL(req.url);
    const offset = clampOffset(url.searchParams.get('offset'));
    const limit = clampLimit(url.searchParams.get('limit'));
    const sort = parseSlimSort(url.searchParams.get('sort'));
    const sortDir = parseSortDir(url.searchParams.get('dir'));

    let dbCount = await countDomainPagesInDb(id, user.id);
    if (dbCount === 0) {
        try {
            await ensureDomainIssueTablesBackfilled({ userId: user.id, domainScanId: id });
        } catch (e) {
            console.error('[CHECKION] slim-pages domain_pages backfill failed', e);
        }
        dbCount = await countDomainPagesInDb(id, user.id);
    }
    if (dbCount > 0) {
        const data = await listSlimPagesFromDomainPagesTable({
            domainScanId: id,
            userId: user.id,
            offset,
            limit,
            sort,
            sortDir,
        });
        return jsonPrivate({ success: true, data, total: dbCount, source: 'db' as const, sort, sortDir });
    }

    const scan = await getDomainScan(id, user.id);
    if (!scan) return apiError('Not found', API_STATUS.NOT_FOUND);

    const total = countPayloadPages(scan);
    const data = sliceSlimPagesFromPayload(scan, offset, limit, id, sort, sortDir);
    return jsonPrivate({ success: true, data, total, source: 'payload' as const, sort, sortDir });
}
