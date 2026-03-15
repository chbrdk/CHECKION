/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/[id]/ux-check (Claude UX Check v2)     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, internalError, API_STATUS } from '@/lib/api-error-handler';
import { getScan, updateScanSummary } from '@/lib/db/scans';
import { invalidateScan } from '@/lib/cache';
import { getAnthropicKey } from '@/lib/llm/config';
import { runUxCheckAgent } from '@/lib/llm/ux-check-agent';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const { id } = await params;
    const result = await getScan(id, user.id);
    if (!result) {
        return apiError('Scan result not found.', API_STATUS.NOT_FOUND);
    }

    const apiKey = getAnthropicKey();
    if (!apiKey) {
        return internalError('ANTHROPIC_API_KEY is not set. UX Check requires Claude.');
    }

    const languageHint = request.headers.get('accept-language')?.includes('de') ? 'Deutsch' : undefined;
    const agentResult = await runUxCheckAgent(result, apiKey, { languageHint });

    if (!agentResult.success) {
        return apiError(agentResult.error, API_STATUS.INTERNAL_ERROR);
    }

    const updated = await updateScanSummary(id, user.id, agentResult.summary);
    if (!updated) {
        return apiError('Failed to save UX Check result.', API_STATUS.INTERNAL_ERROR);
    }
    invalidateScan(id);

    return NextResponse.json(agentResult.summary);
}
