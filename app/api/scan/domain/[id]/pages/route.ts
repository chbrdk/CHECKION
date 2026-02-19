/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/pages (paginated page list)   */
/*  Use after summary when totalPageCount > summary.pages.length.      */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCachedDomainScan } from '@/lib/cache';
import { getSlimPagesSlice } from '@/lib/domain-summary';
import { DOMAIN_PAGES_INCREMENT } from '@/lib/constants';

export async function GET(
    request: NextRequest,
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
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || DOMAIN_PAGES_INCREMENT));
    const total = (scan.pages ?? []).length;
    const pages = getSlimPagesSlice(scan, offset, limit);
    return NextResponse.json({
        pages,
        offset,
        limit,
        total,
        hasMore: offset + pages.length < total,
    });
}
