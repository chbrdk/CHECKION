/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/domain/[id]/journey (User Journey Agent) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';
import { getOpenAIKey } from '@/lib/llm/config';
import { runJourneyAgent } from '@/lib/llm/journey-agent';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const domainResult = await getDomainScan(id, session.user.id);
    if (!domainResult) {
        return NextResponse.json({ error: 'Domain scan not found.' }, { status: 404 });
    }

    if (domainResult.status !== 'complete') {
        return NextResponse.json(
            { error: 'Domain scan must be complete before running a journey.' },
            { status: 400 },
        );
    }

    let body: { goal?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
    if (!goal) {
        return NextResponse.json({ error: 'Body must include goal (string).' }, { status: 400 });
    }

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

    const result = await runJourneyAgent(openai, goal, domainResult);
    return NextResponse.json(result);
}
