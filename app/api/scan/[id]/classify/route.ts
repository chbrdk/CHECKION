/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/[id]/classify (page classification: tags + tier) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, internalError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getScan, updateScanResult } from '@/lib/db/scans';
import { invalidateScan } from '@/lib/cache';
import { classifyPageWithLlm } from '@/lib/llm/page-classification';
import { getAnthropicKey } from '@/lib/llm/config';
import { refreshDomainPayloadFromScans } from '@/lib/domain-scan-classify';
import { reportUsage } from '@/lib/usage-report';

const MIN_BODY_LENGTH = 50;

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

    const { id } = await params;
    const result = await getScan(id, user.id);
    if (!result) {
        return apiError('Scan result not found.', API_STATUS.NOT_FOUND);
    }
    const excerpt = (result.bodyTextExcerpt ?? '').trim();
    if (excerpt.length < MIN_BODY_LENGTH) {
        return apiError(
            'Page has insufficient content to classify. Body text excerpt is missing or too short.',
            API_STATUS.BAD_REQUEST
        );
    }

    if (!getAnthropicKey()) {
        console.error('[CHECKION] classify: ANTHROPIC_API_KEY missing');
        return internalError('Anthropic API key not configured (required for page classification).');
    }

    let pageClassification;
    try {
        pageClassification = await classifyPageWithLlm(result);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'LLM request failed';
        console.error('[CHECKION] classify: Claude API error', e);
        return apiError(message, API_STATUS.INTERNAL_ERROR);
    }
    if (!pageClassification) {
        return apiError('Classification failed or returned no result.', API_STATUS.INTERNAL_ERROR);
    }
    const updated = await updateScanResult(id, user.id, { pageClassification });
    if (!updated) {
        return apiError('Failed to save classification.', API_STATUS.INTERNAL_ERROR);
    }
    invalidateScan(id);

    if (result.groupId) {
        try {
            await refreshDomainPayloadFromScans(result.groupId, user.id);
        } catch {
            // non-fatal: single scan is updated
        }
    }

    try {
        reportUsage({
            userId: user.id,
            eventType: 'page_classify',
            rawUnits: { pages: 1 },
            idempotencyKey: `classify:${id}`,
        });
    } catch { /* never affect response */ }

    return NextResponse.json({ success: true, data: pageClassification });
}
