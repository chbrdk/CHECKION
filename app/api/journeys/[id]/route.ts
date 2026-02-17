/* ------------------------------------------------------------------ */
/*  CHECKION – GET/DELETE /api/journeys/[id]                           */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSavedJourney, deleteSavedJourney } from '@/lib/db/journeys';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const row = await getSavedJourney(id, session.user.id);
    if (!row) {
        return NextResponse.json({ error: 'Saved journey not found.' }, { status: 404 });
    }
    return NextResponse.json(row);
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const ok = await deleteSavedJourney(id, session.user.id);
    if (!ok) {
        return NextResponse.json({ error: 'Saved journey not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
}
