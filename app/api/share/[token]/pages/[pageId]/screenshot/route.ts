/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/share/[token]/pages/[pageId]/screenshot        */
/*  Public: screenshot for one page of shared domain or shared single. */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getShareByToken } from '@/lib/db/shares';
import { getDomainScan, getScan } from '@/lib/db/scans';
import { readScreenshot } from '@/lib/screenshot-storage';
import { canAccessShare, isSharedDomainPageAllowed } from '@/lib/share-access';

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
        return apiError('Not found', API_STATUS.NOT_FOUND);
    }
    if (!canAccessShare(share.passwordHash, request, token)) {
        return apiError('Password required', API_STATUS.FORBIDDEN, { requiresPassword: true });
    }

    if (share.resourceType === 'single') {
        if (pageId !== share.resourceId) {
            return apiError('Not found', API_STATUS.NOT_FOUND);
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
        return apiError('Not found', API_STATUS.NOT_FOUND);
    }

    const domain = await getDomainScan(share.resourceId, share.userId);
    if (!domain) return apiError('Not found', API_STATUS.NOT_FOUND);

    const page = await getScan(pageId, share.userId);
    if (!isSharedDomainPageAllowed(domain, pageId, page)) {
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
