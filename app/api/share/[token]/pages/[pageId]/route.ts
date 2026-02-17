/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token]/pages/[pageId] (public)         */
/*  Returns full ScanResult for one page of a shared domain scan.     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getShareByToken } from '@/lib/db/shares';
import { getDomainScan } from '@/lib/db/scans';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string; pageId: string }> }
) {
    const { token, pageId } = await params;
    const share = await getShareByToken(token);
    if (!share) {
        return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
    }
    if (share.resourceType !== 'domain') {
        return NextResponse.json({ error: 'Not a domain share' }, { status: 400 });
    }

    const domain = await getDomainScan(share.resourceId, share.userId);
    if (!domain) return NextResponse.json({ error: 'Domain scan not found' }, { status: 404 });

    const page = (domain.pages ?? []).find((p) => p.id === pageId);
    if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    return NextResponse.json(page);
}
