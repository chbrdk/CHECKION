/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/[id]                                     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { scanStore } from '@/lib/store';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const result = scanStore.get(id);

    if (!result) {
        return NextResponse.json({ error: 'Scan result not found.' }, { status: 404 });
    }

    return NextResponse.json(result);
}
