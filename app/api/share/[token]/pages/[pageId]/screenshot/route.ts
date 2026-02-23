/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token]/pages/[pageId]/screenshot        */
/*  Public: screenshot for one page of shared domain or shared single. */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getShareByToken } from '@/lib/db/shares';
import { getDomainScan } from '@/lib/db/scans';
import { readScreenshot } from '@/lib/screenshot-storage';
import { canAccessShare } from '@/lib/share-access';

const PLACEHOLDER_SVG = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#f5f5f5"/>
  <text x="400" y="200" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#666">Screenshot nicht verfügbar</text>
</svg>`,
    'utf8'
);

export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string; pageId: string }> }
) {
    const { token, pageId } = await params;
    const share = await getShareByToken(token);
    if (!share) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!canAccessShare(share.passwordHash, request, token)) {
        return NextResponse.json({ error: 'Password required', requiresPassword: true }, { status: 403 });
    }

    if (share.resourceType === 'single') {
        if (pageId !== share.resourceId) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        const buffer = await readScreenshot(pageId);
        if (buffer) {
            return new NextResponse(new Uint8Array(buffer), {
                headers: { 'Content-Type': 'image/jpeg' },
            });
        }
        return new NextResponse(PLACEHOLDER_SVG, { headers: { 'Content-Type': 'image/svg+xml' } });
    }

    if (share.resourceType !== 'domain') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const domain = await getDomainScan(share.resourceId, share.userId);
    if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const inList = (domain.pages ?? []).some((p) => p.id === pageId);
    if (!inList) {
        return new NextResponse(PLACEHOLDER_SVG, {
            headers: { 'Content-Type': 'image/svg+xml' },
        });
    }

    const buffer = await readScreenshot(pageId);
    if (buffer) {
        return new NextResponse(new Uint8Array(buffer), {
            headers: { 'Content-Type': 'image/jpeg' },
        });
    }

    return new NextResponse(PLACEHOLDER_SVG, { headers: { 'Content-Type': 'image/svg+xml' } });
}
