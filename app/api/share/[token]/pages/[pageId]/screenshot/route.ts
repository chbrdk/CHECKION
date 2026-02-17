/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token]/pages/[pageId]/screenshot        */
/*  Public: returns screenshot image for one page of shared domain.   */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getShareByToken } from '@/lib/db/shares';
import { getDomainScan } from '@/lib/db/scans';
import { isFileScreenshot, readScreenshot } from '@/lib/screenshot-storage';

const PLACEHOLDER_SVG = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#f5f5f5"/>
  <text x="400" y="200" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#666">Screenshot nicht verfügbar</text>
</svg>`,
    'utf8'
);

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string; pageId: string }> }
) {
    const { token, pageId } = await params;
    const share = await getShareByToken(token);
    if (!share || share.resourceType !== 'domain') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const domain = await getDomainScan(share.resourceId, share.userId);
    if (!domain) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const page = (domain.pages ?? []).find((p) => p.id === pageId);
    if (!page) {
        return new NextResponse(PLACEHOLDER_SVG, {
            headers: { 'Content-Type': 'image/svg+xml' },
        });
    }

    if (page.screenshot?.startsWith('data:')) {
        const match = page.screenshot.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) return new NextResponse(PLACEHOLDER_SVG, { headers: { 'Content-Type': 'image/svg+xml' } });
        const buffer = Buffer.from(match[2], 'base64');
        return new NextResponse(new Uint8Array(buffer), {
            headers: { 'Content-Type': match[1] },
        });
    }

    if (page.screenshot && isFileScreenshot(page.screenshot)) {
        const buffer = await readScreenshot(pageId);
        if (buffer) {
            return new NextResponse(new Uint8Array(buffer), {
                headers: { 'Content-Type': 'image/jpeg' },
            });
        }
    }

    // Domain-Scans speichern Seiten als "slim" (screenshot: ''). Datei liegt trotzdem unter pageId.
    const buffer = await readScreenshot(pageId);
    if (buffer) {
        return new NextResponse(new Uint8Array(buffer), {
            headers: { 'Content-Type': 'image/jpeg' },
        });
    }

    return new NextResponse(PLACEHOLDER_SVG, { headers: { 'Content-Type': 'image/svg+xml' } });
}
