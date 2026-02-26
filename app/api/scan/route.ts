/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan                                         */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runScan } from '@/lib/scanner';
import { addScan } from '@/lib/db/scans';
import { listCachedStandaloneScans, getCachedStandaloneScansCount, invalidateScansList } from '@/lib/cache';
import type { ScanRequest, Device } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { DASHBOARD_SCANS_PAGE_SIZE } from '@/lib/constants';

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = (await request.json()) as ScanRequest;

        if (!body.url || typeof body.url !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid "url" field.' },
                { status: 400 },
            );
        }

        // Basic URL validation
        try {
            new URL(body.url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format. Please provide a full URL including protocol (e.g. https://example.com).' },
                { status: 400 },
            );
        }



        const groupId = uuidv4();
        const devices: Device[] = ['desktop', 'tablet', 'mobile'];

        // Run scans in parallel
        const results = await Promise.all(
            devices.map(device =>
                runScan({
                    url: body.url,
                    standard: body.standard,
                    runners: body.runners,
                    device,
                    groupId
                })
            )
        );

        for (const result of results) {
            await addScan(session.user.id, result);
        }
        invalidateScansList(session.user.id);

        // Saliency heatmap: user starts it on the result page (POST /api/saliency/generate → jobId → poll /api/saliency/result) to avoid timeouts.

        // Find desktop result to return (for redirect)
        const desktopResult = results.find(r => r.device === 'desktop') || results[0];

        return NextResponse.json({
            success: true,
            data: desktopResult
        });
    } catch (err) {
        console.error('[CHECKION] Scan failed:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: `Scan failed: ${message}` },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || DASHBOARD_SCANS_PAGE_SIZE), 100);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;
    const [list, total] = await Promise.all([
        listCachedStandaloneScans(session.user.id, { limit, offset }),
        getCachedStandaloneScansCount(session.user.id),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return NextResponse.json({
        data: list,
        pagination: { total, page, limit, totalPages },
    });
}
