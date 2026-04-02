/* ------------------------------------------------------------------ */
/*  GET /api/scan/domain/[id]/slim-pages — paged SlimPage[] (DB slice)   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScan } from '@/lib/db/scans';
import {
    countDomainPagesInDb,
    listSlimPagesFromDomainPagesTable,
    sliceSlimPagesFromPayload,
    countPayloadPages,
} from '@/lib/db/domain-slim-pages';

function clampOffset(v: string | null): number {
    return Math.max(0, parseInt(v ?? '0', 10) || 0);
}

function clampLimit(v: string | null): number {
    return Math.max(1, Math.min(500, parseInt(v ?? '100', 10) || 100));
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

    const dbCount = await countDomainPagesInDb(id, user.id);
    if (dbCount > 0) {
        const data = await listSlimPagesFromDomainPagesTable({
            domainScanId: id,
            userId: user.id,
            offset,
            limit,
        });
        return NextResponse.json(
            { success: true, data, total: dbCount, source: 'db' as const },
            { headers: { 'Cache-Control': 'private, max-age=60' } }
        );
    }

    const scan = await getDomainScan(id, user.id);
    if (!scan) return apiError('Not found', API_STATUS.NOT_FOUND);

    const total = countPayloadPages(scan);
    const data = sliceSlimPagesFromPayload(scan, offset, limit, id);
    return NextResponse.json(
        { success: true, data, total, source: 'payload' as const },
        { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
}
