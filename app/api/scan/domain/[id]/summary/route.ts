/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/summary (optimized for large scans) */
/*  Returns aggregated data + first N pages only; use .../pages for more.   */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCachedDomainScan } from '@/lib/cache';
import { buildDomainSummary } from '@/lib/domain-summary';
import { SUMMARY_PAGES_INITIAL } from '@/lib/constants';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const scan = await getCachedDomainScan(id, session.user.id);
    if (!scan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
    const summary = buildDomainSummary(scan, {
        pagesLimit: SUMMARY_PAGES_INITIAL,
        includePageIndex: false,
    });
    return NextResponse.json(summary);
}
