/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/summary (optimized for large scans) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDomainScan } from '@/lib/db/scans';
import { buildDomainSummary } from '@/lib/domain-summary';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const scan = await getDomainScan(id, session.user.id);
    if (!scan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
    const summary = buildDomainSummary(scan);
    return NextResponse.json(summary);
}
