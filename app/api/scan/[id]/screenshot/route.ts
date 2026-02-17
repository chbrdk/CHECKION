/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/[id]/screenshot (serves image from disk or inline) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getScan } from '@/lib/db/scans';
import { isFileScreenshot, readScreenshot } from '@/lib/screenshot-storage';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const result = await getScan(id, session.user.id);

    if (!result || !result.screenshot) {
        return new NextResponse(null, { status: 404 });
    }

    if (isFileScreenshot(result.screenshot)) {
        const buffer = readScreenshot(id);
        if (!buffer) return new NextResponse(null, { status: 404 });
        return new NextResponse(buffer, {
            headers: { 'Content-Type': 'image/jpeg' },
        });
    }

    if (result.screenshot.startsWith('data:')) {
        const match = result.screenshot.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) return new NextResponse(null, { status: 404 });
        const contentType = match[1];
        const base64 = match[2];
        const buffer = Buffer.from(base64, 'base64');
        return new NextResponse(buffer, {
            headers: { 'Content-Type': contentType },
        });
    }

    return new NextResponse(null, { status: 404 });
}
