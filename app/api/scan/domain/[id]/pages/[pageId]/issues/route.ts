import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScan } from '@/lib/db/scans';
import { listPageIssuesPaged } from '@/lib/db/domain-issues';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

function clampLimit(v: string | null): number {
    return Math.max(1, Math.min(200, parseInt(v ?? '50', 10) || 50));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; pageId: string }> }) {
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

    const { id, pageId } = await ctx.params;
    const scan = await getDomainScan(id, user.id);
    if (!scan) return apiError('Not found', API_STATUS.NOT_FOUND);

    const url = new URL(req.url);
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursorId = url.searchParams.get('cursorId');
    const cursor = cursorId ? { id: cursorId } : null;

    const result = await listPageIssuesPaged({
        userId: user.id,
        domainScanId: id,
        pageId,
        limit,
        cursor,
    });

    return jsonPrivate({
        success: true,
        data: result.data,
        pagination: { nextCursor: result.nextCursor },
    });
}

