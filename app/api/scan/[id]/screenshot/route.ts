/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/[id]/screenshot (serves image from disk or inline) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getScan } from '@/lib/db/scans';
import { isFileScreenshot, readScreenshot } from '@/lib/screenshot-storage';

/** Visible placeholder when screenshot file is missing (e.g. other instance wrote it). */
const PLACEHOLDER_SVG = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#f5f5f5"/>
  <text x="400" y="180" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" fill="#666">Screenshot nicht verfügbar</text>
  <text x="400" y="220" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#999">Die Bilddatei fehlt auf diesem Server (z.&amp;B. bei mehreren Instanzen).</text>
  <text x="400" y="250" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#999">Scan erneut ausführen, um das Screenshot hier anzuzeigen.</text>
</svg>`,
    'utf8'
);

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const result = await getScan(id, session.user.id);

    if (!result || !result.screenshot) {
        return new NextResponse(null, { status: 404 });
    }

    if (isFileScreenshot(result.screenshot)) {
        const buffer = await readScreenshot(id);
        if (!buffer) {
            return new NextResponse(new Uint8Array(PLACEHOLDER_SVG), {
                headers: { 'Content-Type': 'image/svg+xml', 'X-Screenshot': 'placeholder' },
            });
        }
        return new NextResponse(new Uint8Array(buffer), {
            headers: { 'Content-Type': 'image/jpeg' },
        });
    }

    if (result.screenshot.startsWith('data:')) {
        const match = result.screenshot.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) return new NextResponse(null, { status: 404 });
        const contentType = match[1];
        const base64 = match[2];
        const buffer = Buffer.from(base64, 'base64');
        return new NextResponse(new Uint8Array(buffer), {
            headers: { 'Content-Type': contentType },
        });
    }

    return new NextResponse(null, { status: 404 });
}
