/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/[id] (requires auth)                     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getScan } from '@/lib/db/scans';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const result = await getScan(id, session.user.id);

    if (!result) {
        return NextResponse.json({ error: 'Scan result not found.' }, { status: 404 });
    }

    return NextResponse.json(result);
}
