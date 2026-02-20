/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/domain/[id]/journey (User Journey Agent) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/auth';
import { getDomainScan, listScansByGroupId } from '@/lib/db/scans';
import { getOpenAIKey } from '@/lib/llm/config';
import { runJourneyAgent, runJourneyAgentStream, type JourneyStreamEvent } from '@/lib/llm/journey-agent';
import { hasStoredAggregated } from '@/lib/domain-summary';
import type { DomainScanResult } from '@/lib/types';
import type { ScanResult } from '@/lib/types';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const domainPayload = await getDomainScan(id, session.user.id);
    if (!domainPayload) {
        return NextResponse.json({ error: 'Domain scan not found.' }, { status: 404 });
    }

    if (domainPayload.status !== 'complete') {
        return NextResponse.json(
            { error: 'Domain scan must be complete before running a journey.' },
            { status: 400 },
        );
    }

    /** Journey needs full ScanResult[] (pageIndex, allLinks, etc.). Load from scans table when stored payload has slim pages. */
    let domainResult: DomainScanResult & { pages: ScanResult[] };
    if (hasStoredAggregated(domainPayload)) {
        const fullPages = await listScansByGroupId(session.user.id, id);
        domainResult = { ...domainPayload, pages: fullPages };
    } else {
        domainResult = domainPayload as DomainScanResult & { pages: ScanResult[] };
    }

    let body: { goal?: string; stream?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
    if (!goal) {
        return NextResponse.json({ error: 'Body must include goal (string).' }, { status: 400 });
    }
    const stream = body?.stream === true;

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch (e) {
        console.error('[CHECKION] journey: OPENAI_API_KEY missing', e);
        return NextResponse.json(
            { error: 'OpenAI API key not configured.' },
            { status: 500 },
        );
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
    return NextResponse.json(result);
}
