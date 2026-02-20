/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token]/pages/[pageId] (public)         */
/*  Returns full ScanResult for one page of a shared domain scan.     */
/*  Page data is stored in scans table (groupId = domain scan id).    */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getCachedShareByToken, getCachedDomainScan, getCachedScan } from '@/lib/cache';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string; pageId: string }> }
) {
    const { token, pageId } = await params;
    const share = await getCachedShareByToken(token);
    if (!share) {
        return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
    }
    if (share.resourceType !== 'domain') {
        return NextResponse.json({ error: 'Not a domain share' }, { status: 400 });
    }

    const domain = await getCachedDomainScan(share.resourceId, share.userId);
    if (!domain) return NextResponse.json({ error: 'Domain scan not found' }, { status: 404 });

    const inList = (domain.pages ?? []).some((p) => p.id === pageId);
    if (!inList) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    const page = await getCachedScan(pageId, share.userId);
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    return NextResponse.json(page);
}
