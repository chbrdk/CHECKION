/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token] (public, no auth)                */
/* Returns { type: 'single'|'domain', data } for the share landing.   */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getShareByToken } from '@/lib/db/shares';
import { getScan } from '@/lib/db/scans';
import { getDomainScan } from '@/lib/db/scans';
import { buildDomainSummary } from '@/lib/domain-summary';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const share = await getShareByToken(token);
    if (!share) {
        return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
    }

    if (share.resourceType === 'single') {
        const scan = await getScan(share.resourceId, share.userId);
        if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        return NextResponse.json({ type: 'single' as const, data: scan });
    }

    const domain = await getDomainScan(share.resourceId, share.userId);
    if (!domain) return NextResponse.json({ error: 'Domain scan not found' }, { status: 404 });
    const summary = buildDomainSummary(domain);
    return NextResponse.json({ type: 'domain' as const, data: summary });
}
