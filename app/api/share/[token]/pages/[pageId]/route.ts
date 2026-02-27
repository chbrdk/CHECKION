/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token]/pages/[pageId] (public)         */
/*  Returns full ScanResult for one page of a shared domain scan.     */
/*  Page data is stored in scans table (groupId = domain scan id).    */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getCachedShareByToken, getCachedDomainScan, getCachedScan } from '@/lib/cache';
import { canAccessShare } from '@/lib/share-access';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string; pageId: string }> }
) {
    const { token, pageId } = await params;
    const share = await getCachedShareByToken(token);
    if (!share) {
        return apiError('Share not found or expired', API_STATUS.NOT_FOUND);
    }
    if (!canAccessShare(share.passwordHash, request, token)) {
        return apiError('Password required', API_STATUS.FORBIDDEN, { requiresPassword: true });
    }
    if (share.resourceType !== 'domain') {
        return apiError('Not a domain share', API_STATUS.BAD_REQUEST);
    }

    const domain = await getCachedDomainScan(share.resourceId, share.userId);
    if (!domain) return apiError('Domain scan not found', API_STATUS.NOT_FOUND);

    const inList = (domain.pages ?? []).some((p) => p.id === pageId);
    if (!inList) return apiError('Page not found', API_STATUS.NOT_FOUND);

    const page = await getCachedScan(pageId, share.userId);
    if (!page) return apiError('Page not found', API_STATUS.NOT_FOUND);

    return NextResponse.json(page);
}
