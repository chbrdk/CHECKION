/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/domain/[id]/classify (classify all pages) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScan, listScansByGroupId, updateScanResult } from '@/lib/db/scans';
import { classifyPageWithLlm } from '@/lib/llm/page-classification';
import { getAnthropicKey } from '@/lib/llm/config';
import { refreshDomainPayloadFromScans } from '@/lib/domain-scan-classify';
import { reportUsage } from '@/lib/usage-report';

const MIN_BODY_LENGTH = 50;
const DELAY_MS = 150;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(_request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const rl = checkRateLimit(`classify:${user.id}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const { id: domainId } = await params;
    const domainScan = await getDomainScan(domainId, user.id);
    if (!domainScan) {
        return apiError('Domain scan not found.', API_STATUS.NOT_FOUND);
    }
    const pages = await listScansByGroupId(user.id, domainId);
    const toClassify = pages.filter(
        (p) => (p.bodyTextExcerpt ?? '').trim().length >= MIN_BODY_LENGTH
    );
    const pageCount = toClassify.length;

    if (pageCount === 0) {
        return NextResponse.json({
            success: true,
            message: 'No pages with sufficient content to classify.',
            pageCount: 0,
        });
    }

    void runClassificationInBackground(domainId, user.id, toClassify);

    return NextResponse.json(
        {
            success: true,
            message: `Classification started for ${pageCount} pages.`,
            pageCount,
        },
        { status: 202 }
    );
}

async function runClassificationInBackground(
    domainId: string,
    userId: string,
    pages: Awaited<ReturnType<typeof listScansByGroupId>>
): Promise<void> {
    if (!getAnthropicKey()) {
        console.error('[CHECKION] domain classify: ANTHROPIC_API_KEY missing');
        return;
    }

    for (let i = 0; i < pages.length; i++) {
        const result = pages[i];
        try {
            const pageClassification = await classifyPageWithLlm(result);
            if (pageClassification) {
                await updateScanResult(result.id, userId, { pageClassification });
                try {
                    reportUsage({
                        userId,
                        eventType: 'page_classify',
                        rawUnits: { pages: 1 },
                        idempotencyKey: `classify:${result.id}`,
                    });
                } catch { /* ignore */ }
            }
        } catch (e) {
            console.error(`[CHECKION] domain classify: page ${result.id} failed`, e);
        }
        if (i < pages.length - 1) await delay(DELAY_MS);
    }

    try {
        await refreshDomainPayloadFromScans(domainId, userId);
    } catch (e) {
        console.error('[CHECKION] domain classify: refresh payload failed', e);
    }
}
