/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/geo-eeat (GEO / E-E-A-T intensive)      */
/*  Starts a GEO/E-E-A-T run: Stufe 1 (technical) in background.     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runScan } from '@/lib/scanner';
import { insertGeoEeatRun, updateGeoEeatRun } from '@/lib/db/geo-eeat-runs';
import { buildGeoEeatResultFromScan } from '@/lib/geo-eeat/stage1';
import { runLlmStages } from '@/lib/geo-eeat/run-llm-stages';
import { runCompetitiveBenchmark } from '@/lib/geo-eeat/competitive-benchmark';
import { v4 as uuidv4 } from 'uuid';

function isValidUrl(s: string): boolean {
    try {
        const u = new URL(s);
        return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
        return false;
    }
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: {
        url?: string;
        domainScanId?: string | null;
        runCompetitive?: boolean;
        competitors?: string[];
        queries?: string[];
        generateQueries?: boolean;
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url) {
        return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
    }
    if (!isValidUrl(url)) {
        return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 });
    }

    const runCompetitive = Boolean(body?.runCompetitive);
    if (runCompetitive) {
        const hasCompetitors = Array.isArray(body.competitors) && body.competitors.length > 0;
        const hasQueries = Array.isArray(body.queries) && body.queries.length > 0;
        if (!hasCompetitors && !hasQueries) {
            return NextResponse.json(
                { error: 'When runCompetitive is true, provide competitors and/or queries.' },
                { status: 400 }
            );
        }
    }

    const jobId = uuidv4();
    await insertGeoEeatRun(jobId, session.user.id, url, {
        domainScanId: body.domainScanId ?? undefined,
    });

    (async () => {
        try {
            await updateGeoEeatRun(jobId, session.user.id, { status: 'running' });
            const scan = await runScan({
                url,
                standard: 'WCAG2AA',
                runners: ['axe', 'htmlcs'],
                device: 'desktop',
            });
            let payload = buildGeoEeatResultFromScan(scan);
            try {
                payload = await runLlmStages(payload);
            } catch (e) {
                console.error('[CHECKION] GEO/E-E-A-T LLM stages error:', e);
            }
            if (runCompetitive && ((body.queries?.length ?? 0) > 0 || (body.competitors?.length ?? 0) > 0)) {
                const competitive = await runCompetitiveBenchmark(
                    url,
                    body.competitors ?? [],
                    body.queries ?? []
                );
                if (competitive) payload.competitive = competitive;
            }
            await updateGeoEeatRun(jobId, session.user.id, {
                status: 'complete',
                payload,
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[CHECKION] GEO/E-E-A-T run failed:', e);
            await updateGeoEeatRun(jobId, session.user.id, {
                status: 'error',
                error: message,
            });
        }
    })();

    return NextResponse.json(
        { success: true, jobId },
        { status: 202 }
    );
}
