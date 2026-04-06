/* GET /api/scan/domain/[id]/page-resolve?url= — resolve single scan id for a page URL */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScan } from '@/lib/db/scans';
import { findScanIdForDomainPageUrl, findScanIdForUrlInPayload } from '@/lib/db/domain-slim-pages';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const user = await getRequestUser(req);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const rl = checkRateLimit(`domain-page-resolve:${user.id}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const { id } = await ctx.params;
    if (!id?.trim()) return apiError('Domain scan id is required', API_STATUS.BAD_REQUEST);

    const pageUrl = new URL(req.url).searchParams.get('url');
    if (!pageUrl?.trim()) {
        return apiError('url query parameter is required', API_STATUS.BAD_REQUEST);
    }

    const fromDb = await findScanIdForDomainPageUrl({
        domainScanId: id,
        userId: user.id,
        url: pageUrl,
    });
    if (fromDb) {
        return jsonPrivate({ success: true, scanId: fromDb.scanId });
    }

    const scan = await getDomainScan(id, user.id);
    if (!scan) return apiError('Not found', API_STATUS.NOT_FOUND);

    const fromPayload = findScanIdForUrlInPayload(scan, pageUrl);
    if (!fromPayload) {
        return apiError('Page not found for this URL', API_STATUS.NOT_FOUND, { code: 'DOMAIN_PAGE_NOT_FOUND' });
    }
    return jsonPrivate({ success: true, scanId: fromPayload.scanId });
}
