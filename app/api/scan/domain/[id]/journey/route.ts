/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/domain/[id]/journey (User Journey Agent) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, internalError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, domainJourneyBodySchema } from '@/lib/api-schemas';
import { getDomainScan, listScansByGroupId } from '@/lib/db/scans';
import { getOpenAIKey } from '@/lib/llm/config';
import { runJourneyAgent, runJourneyAgentStream, type JourneyStreamEvent } from '@/lib/llm/journey-agent';
import { reportUsage } from '@/lib/usage-report';
import { hasStoredAggregated } from '@/lib/domain-summary';
import type { DomainScanResult } from '@/lib/types';
import type { ScanResult } from '@/lib/types';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const { id } = await params;
    const domainPayload = await getDomainScan(id, user.id);
    if (!domainPayload) {
        return apiError('Domain scan not found.', API_STATUS.NOT_FOUND);
    }

    if (domainPayload.status !== 'complete') {
        return apiError('Domain scan must be complete before running a journey.', API_STATUS.BAD_REQUEST);
    }

    /** Journey needs full ScanResult[] (pageIndex, allLinks, etc.). Load from scans table when stored payload has slim pages. */
    let domainResult: DomainScanResult & { pages: ScanResult[] };
    if (hasStoredAggregated(domainPayload)) {
        const fullPages = await listScansByGroupId(user.id, id);
        domainResult = { ...domainPayload, pages: fullPages };
    } else {
        domainResult = domainPayload as DomainScanResult & { pages: ScanResult[] };
    }

    const parsed = await parseApiBody(request, domainJourneyBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const goal = parsed.goal;
    const stream = parsed.stream === true;

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch (e) {
        console.error('[CHECKION] journey: OPENAI_API_KEY missing', e);
        return internalError('OpenAI API key not configured.');
    }

    if (stream) {
        const encoder = new TextEncoder();
        const streamResponse = new ReadableStream({
            async start(controller) {
                try {
                    for await (const event of runJourneyAgentStream(openai, goal, domainResult)) {
                        controller.enqueue(encoder.encode('data: ' + JSON.stringify(event) + '\n\n'));
                    }
                } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Stream failed.';
                    controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'error', message: msg } as JourneyStreamEvent) + '\n\n'));
                    controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'done', result: { steps: [], goalReached: false, message: msg } } as JourneyStreamEvent) + '\n\n'));
                } finally {
                    try {
                        reportUsage({
                            userId: user.id,
                            eventType: 'journey_agent',
                            rawUnits: { runs: 1 },
                            idempotencyKey: `domain-journey-stream:${id}:${Date.now()}`,
                        });
                    } catch { /* ignore */ }
                    controller.close();
                }
            },
        });
        return new Response(streamResponse, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    }

    const result = await runJourneyAgent(openai, goal, domainResult);
    try {
        reportUsage({
            userId: user.id,
            eventType: 'journey_agent',
            rawUnits: { runs: 1 },
            idempotencyKey: `domain-journey:${id}:${goal.slice(0, 50)}:${Date.now()}`,
        });
    } catch { /* never affect response */ }
    return NextResponse.json(result);
}
