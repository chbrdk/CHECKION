import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScan } from '@/lib/db/scans';
import { countDomainIssueGroupsForScan, listIssueGroupsPaged } from '@/lib/db/domain-issues';
import { ensureDomainIssueTablesBackfilled } from '@/lib/domain-issues-backfill';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

function clampLimit(v: string | null): number {
    const n = Math.max(1, Math.min(200, parseInt(v ?? '50', 10) || 50));
    return n;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const user = await getRequestUser(req);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const rl = checkRateLimit(`domain-issues:${user.id}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const { id } = await ctx.params;
    const scan = await getDomainScan(id, user.id);
    if (!scan) return apiError('Not found', API_STATUS.NOT_FOUND);

    const url = new URL(req.url);
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursorPageCountStr = url.searchParams.get('cursorPageCount');
    const cursorGroupKey = url.searchParams.get('cursorGroupKey');
    const cursorPageCount = cursorPageCountStr != null ? (parseInt(cursorPageCountStr, 10) || null) : null;
    const cursor = cursorPageCount != null && cursorGroupKey ? { pageCount: cursorPageCount, groupKey: cursorGroupKey } : null;
    const type = url.searchParams.get('type');
    const wcagLevel = url.searchParams.get('wcagLevel');
    const q = url.searchParams.get('q');

    const result = await listIssueGroupsPaged({
        userId: user.id,
        domainScanId: id,
        limit,
        cursor,
        type: type || null,
        wcagLevel: wcagLevel || null,
        q: q || null,
    });

    // On-demand backfill for legacy scans: only when the first *unfiltered* page is empty
    // **and** there are truly zero groups in DB (do not backfill when filters/search match nothing).
    const isUnfilteredFirstPage = cursor == null && !type && !wcagLevel && !q;
    if (isUnfilteredFirstPage && (result.data?.length ?? 0) === 0 && scan.status === 'complete') {
        const totalGroups = await countDomainIssueGroupsForScan({ userId: user.id, domainScanId: id });
        if (totalGroups === 0) {
            void (async () => {
                try {
                    await ensureDomainIssueTablesBackfilled({ userId: user.id, domainScanId: id });
                } catch (e) {
                    console.error('[CHECKION] domain issues backfill failed', e);
                }
            })();
        }
    }

    return jsonPrivate({
        success: true,
        data: result.data,
        pagination: { nextCursor: result.nextCursor },
    });
}

