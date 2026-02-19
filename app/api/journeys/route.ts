/* ------------------------------------------------------------------ */
/*  CHECKION – GET/POST /api/journeys (saved journey history)         */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addSavedJourney, listSavedJourneys, getSavedJourneysCount } from '@/lib/db/journeys';
import { getDomainScan } from '@/lib/db/scans';
import type { JourneyResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const domainScanId = searchParams.get('domainScanId') ?? undefined;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
        listSavedJourneys(session.user.id, { domainScanId, limit, offset }),
        getSavedJourneysCount(session.user.id, domainScanId),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return NextResponse.json({
        data: rows,
        pagination: { total, page, limit, totalPages },
    });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body: { domainScanId?: string; goal?: string; result?: JourneyResult; name?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }
    const domainScanId = typeof body.domainScanId === 'string' ? body.domainScanId.trim() : '';
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    const result = body.result as JourneyResult | undefined;
    const name = typeof body.name === 'string' ? body.name.trim() || undefined : undefined;
    if (!domainScanId || !goal || !result || !Array.isArray(result.steps)) {
        return NextResponse.json(
            { error: 'Body must include domainScanId, goal, and result (JourneyResult with steps).' },
            { status: 400 }
        );
    }
    const domain = await getDomainScan(domainScanId, session.user.id);
    if (!domain) {
        return NextResponse.json({ error: 'Domain scan not found.' }, { status: 404 });
    }
    const id = uuidv4();
    await addSavedJourney(id, session.user.id, domainScanId, goal, result, name);
    return NextResponse.json({ id, success: true });
}
