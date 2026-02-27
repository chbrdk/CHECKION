/* ------------------------------------------------------------------ */
/*  CHECKION – GET/DELETE /api/journeys/[id]                           */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getSavedJourney, deleteSavedJourney } from '@/lib/db/journeys';
import { invalidateJourneys } from '@/lib/cache';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const row = await getSavedJourney(id, session.user.id);
    if (!row) {
        return apiError('Saved journey not found.', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json(row);
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const ok = await deleteSavedJourney(id, session.user.id);
    if (!ok) {
        return apiError('Saved journey not found.', API_STATUS.NOT_FOUND);
    }
    invalidateJourneys(session.user.id);
    return NextResponse.json({ success: true });
}
