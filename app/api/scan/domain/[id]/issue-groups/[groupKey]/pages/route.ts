import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScanAccess } from '@/lib/domain-scan-access';
import { getDomainScan } from '@/lib/db/scans';
import { listGroupPagesPaged } from '@/lib/db/domain-issues';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

function clampLimit(v: string | null): number {
    return Math.max(1, Math.min(200, parseInt(v ?? '50', 10) || 50));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; groupKey: string }> }) {
    const viewer = await getRequestUser(req);
    if (!viewer && !isAdminApiRequest(req)) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const rl = checkRateLimit(`domain-issues:${viewer?.id ?? 'admin-api'}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const { id, groupKey } = await ctx.params;
    const access = await getDomainScanAccess(req, id);
    if (!access.ok) return apiError('Not found', API_STATUS.NOT_FOUND);
    const owner = access.ownerUserId;
    const scan = await getDomainScan(id, owner);
    if (!scan) return apiError('Not found', API_STATUS.NOT_FOUND);

    const url = new URL(req.url);
    const limit = clampLimit(url.searchParams.get('limit'));
    const cursorUrl = url.searchParams.get('cursorUrl');
    const cursor = cursorUrl ? { url: cursorUrl } : null;

    const result = await listGroupPagesPaged({
        userId: owner,
        domainScanId: id,
        groupKey,
        limit,
        cursor,
    });

    return jsonPrivate({
        success: true,
        data: result.data,
        pagination: { nextCursor: result.nextCursor },
    });
}

