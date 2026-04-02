import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScan } from '@/lib/db/scans';
import { listGroupPagesPaged } from '@/lib/db/domain-issues';

function clampLimit(v: string | null): number {
    return Math.max(1, Math.min(200, parseInt(v ?? '50', 10) || 50));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; groupKey: string }> }) {
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

    const { id, groupKey } = await ctx.params;
    const scan = await getDomainScan(id, user.id);
    if (!scan) return apiError('Not found', API_STATUS.NOT_FOUND);

    const url = new URL(req.url);
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursorUrl = url.searchParams.get('cursorUrl');
    const cursor = cursorUrl ? { url: cursorUrl } : null;

    const result = await listGroupPagesPaged({
        userId: user.id,
        domainScanId: id,
        groupKey,
        limit,
        cursor,
    });

    return NextResponse.json(
        { success: true, data: result.data, pagination: { nextCursor: result.nextCursor } },
        { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
}

