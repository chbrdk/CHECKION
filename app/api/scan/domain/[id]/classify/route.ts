/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/domain/[id]/classify (classify all pages) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { canMutateDomainScanAsOwner, getDomainScanAccess } from '@/lib/domain-scan-access';
import { getDomainScan, listScansByGroupIdOmitImageBlobs } from '@/lib/db/scans';
import { PAGE_CLASSIFY_MIN_BODY_EXCERPT_CHARS } from '@/lib/llm/page-classification';
import { runDomainScanPageClassificationJob } from '@/lib/domain-scan-page-classification-job';

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(_request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const rl = await checkRateLimit(`classify:${user.id}`, 'default');
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const { id: domainId } = await params;
    const access = await getDomainScanAccess(_request, domainId);
    if (!access.ok) {
        return apiError('Domain scan not found.', API_STATUS.NOT_FOUND);
    }
    if (!canMutateDomainScanAsOwner(access)) {
        return apiError('Forbidden', API_STATUS.FORBIDDEN);
    }
    const ownerUserId = access.ownerUserId;
    const domainScan = await getDomainScan(domainId, ownerUserId);
    if (!domainScan) {
        return apiError('Domain scan not found.', API_STATUS.NOT_FOUND);
    }
    const pages = await listScansByGroupIdOmitImageBlobs(ownerUserId, domainId);
    const toClassify = pages.filter(
        (p) => (p.bodyTextExcerpt ?? '').trim().length >= PAGE_CLASSIFY_MIN_BODY_EXCERPT_CHARS
    );
    const pageCount = toClassify.length;

    if (pageCount === 0) {
        return NextResponse.json({
            success: true,
            message: 'No pages with sufficient content to classify.',
            pageCount: 0,
        });
    }

    void runDomainScanPageClassificationJob({ domainScanId: domainId, userId: ownerUserId });

    return NextResponse.json(
        {
            success: true,
            message: `Classification started for ${pageCount} pages.`,
            pageCount,
        },
        { status: 202 }
    );
}
