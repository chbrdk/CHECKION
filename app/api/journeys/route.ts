/* ------------------------------------------------------------------ */
/*  CHECKION – GET/POST /api/journeys (saved journey history)         */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { addSavedJourney } from '@/lib/db/journeys';
import {
    getCachedDomainScan,
    listCachedSavedJourneys,
    getCachedSavedJourneysCount,
    invalidateJourneys,
} from '@/lib/cache';
import type { JourneyResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { searchParams } = new URL(request.url);
    const domainScanId = searchParams.get('domainScanId') ?? undefined;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
        listCachedSavedJourneys(session.user.id, { domainScanId, limit, offset }),
        getCachedSavedJourneysCount(session.user.id, domainScanId),
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
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    let body: { domainScanId?: string; goal?: string; result?: JourneyResult; name?: string };
    try {
        body = await request.json();
    } catch {
        return apiError('Invalid JSON.', API_STATUS.BAD_REQUEST);
    }
    const domainScanId = typeof body.domainScanId === 'string' ? body.domainScanId.trim() : '';
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    const result = body.result as JourneyResult | undefined;
    const name = typeof body.name === 'string' ? body.name.trim() || undefined : undefined;
    if (!domainScanId || !goal || !result || !Array.isArray(result.steps)) {
        return apiError('Body must include domainScanId, goal, and result (JourneyResult with steps).', API_STATUS.BAD_REQUEST);
    }
    const domain = await getCachedDomainScan(domainScanId, session.user.id);
    if (!domain) {
        return apiError('Domain scan not found.', API_STATUS.NOT_FOUND);
    }
    const id = uuidv4();
    await addSavedJourney(id, session.user.id, domainScanId, goal, result, name);
    invalidateJourneys(session.user.id, domainScanId);
    return NextResponse.json({ id, success: true });
}
