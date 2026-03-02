/* ------------------------------------------------------------------ */
/*  CHECKION – GET/DELETE /api/journeys/[id]                           */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getSavedJourney, deleteSavedJourney } from '@/lib/db/journeys';
import { invalidateJourneys } from '@/lib/cache';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const row = await getSavedJourney(id, user.id);
    if (!row) {
        return apiError('Saved journey not found.', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json(row);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const ok = await deleteSavedJourney(id, user.id);
    if (!ok) {
        return apiError('Saved journey not found.', API_STATUS.NOT_FOUND);
    }
    invalidateJourneys(user.id);
    return NextResponse.json({ success: true });
}
