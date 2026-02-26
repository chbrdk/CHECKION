/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/saliency/generate (SUM job → jobId | AI → success)  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { auth } from '@/auth';
import { getScan, updateScanResult } from '@/lib/db/scans';
import { invalidateScan } from '@/lib/cache';
import { enrichPageIndexWithSaliency } from '@/lib/page-index';
import { getAttentionRegionsFromVision, renderHeatmapFromRegions } from '@/lib/saliency-ai';
import { getScreenshotBase64 } from '@/lib/screenshot-storage';

/** Base URL of the saliency service. Public domains stay HTTPS; internal hostnames (no dot) use http. */
function getSaliencyBaseUrl(): string | undefined {
    const raw = process.env.SALIENCY_SERVICE_URL;
    if (!raw?.trim()) return undefined;
    const url = raw.replace(/\/$/, '').trim();
    if (!url.toLowerCase().startsWith('https://')) return url;
    try {
        const host = new URL(url).hostname;
        if (host.includes('.')) return url;
    } catch {
        /* keep url as-is if parse fails */
    }
    return url.replace(/^https:\/\//i, 'http://');
}

/** Timeout for job creation only (short). */
const JOB_CREATE_TIMEOUT_MS = 15_000;

const USE_AI_SALIENCY = process.env.SALIENCY_USE_AI === 'true' || process.env.SALIENCY_USE_AI === '1';

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { scanId?: string };
    try {
        body = (await request.json()) as { scanId?: string };
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const scanId = body.scanId;
    if (!scanId || typeof scanId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid "scanId".' }, { status: 400 });
    }

    const result = await getScan(scanId, session.user.id);
    if (!result) {
        return NextResponse.json({ error: 'Scan not found.' }, { status: 404 });
    }
    const imageBase64 = await getScreenshotBase64(result.screenshot, scanId);
    if (!imageBase64) {
        return NextResponse.json({ error: 'Scan has no screenshot or screenshot file missing.' }, { status: 400 });
    }

    // --- AI path: OpenAI Vision → regions → render heatmap (no SUM, no polling) ---
    if (USE_AI_SALIENCY && process.env.OPENAI_API_KEY?.trim()) {
        try {
            const buf = Buffer.from(imageBase64, 'base64');
            const meta = await sharp(buf).metadata();
            const width = meta.width ?? 1920;
            const height = meta.height ?? 1080;

            const regions = await getAttentionRegionsFromVision(imageBase64, width, height);
            if (regions.length === 0) {
                return NextResponse.json(
                    { error: 'AI could not detect attention regions. Try again or use SUM backend.' },
                    { status: 502 },
                );
            }

            const heatmapBase64 = await renderHeatmapFromRegions(regions, width, height);
            const dataUrl = `data:image/png;base64,${heatmapBase64}`;

            let pageIndexPatch: { pageIndex?: typeof result.pageIndex } = {};
            if (result.pageIndex) {
                try {
                    pageIndexPatch.pageIndex = await enrichPageIndexWithSaliency(result.pageIndex, dataUrl);
                } catch (e) {
                    console.error('[CHECKION] saliency/generate (AI): enrichPageIndexWithSaliency failed', e);
                }
            }

            const updated = await updateScanResult(scanId, session.user.id, {
                saliencyHeatmap: dataUrl,
                ...pageIndexPatch,
            });
            if (!updated) {
                return NextResponse.json({ error: 'Failed to save heatmap to scan.' }, { status: 500 });
            }
            invalidateScan(scanId);
            return NextResponse.json({ success: true });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'AI saliency failed';
            console.error('[CHECKION] saliency/generate (AI):', e);
            return NextResponse.json({ error: message }, { status: 502 });
        }
    }

    // --- SUM path: create job, return jobId (client polls /api/saliency/result) ---
    const saliencyBaseUrl = getSaliencyBaseUrl();
    if (!saliencyBaseUrl) {
        return NextResponse.json(
            {
                error: USE_AI_SALIENCY
                    ? 'AI saliency needs OPENAI_API_KEY. SUM needs SALIENCY_SERVICE_URL.'
                    : 'Saliency not configured: set SALIENCY_SERVICE_URL or SALIENCY_USE_AI=1 and OPENAI_API_KEY.',
            },
            { status: 503 },
        );
    }

    const jobsUrl = saliencyBaseUrl + '/jobs';
    let res: Response;
    try {
        res = await fetch(jobsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: imageBase64 }),
            signal: AbortSignal.timeout(JOB_CREATE_TIMEOUT_MS),
        });
    } catch (e) {
        const message =
            e instanceof Error ? e.message : 'Saliency service request failed';
        console.error('[CHECKION] saliency/generate: create job error', { url: jobsUrl, error: message });
        return NextResponse.json(
            { error: message + ' (SALIENCY_SERVICE_URL prüfen.)' },
            { status: 502 },
        );
    }

    if (!res.ok) {
        const text = await res.text();
        console.error('[CHECKION] saliency/generate: service returned', res.status, text);
        return NextResponse.json(
            { error: `Saliency service error: ${res.status}` },
            { status: 502 },
        );
    }

    let data: { job_id?: string };
    try {
        data = (await res.json()) as { job_id?: string };
    } catch {
        return NextResponse.json(
            { error: 'Invalid response from saliency service.' },
            { status: 502 },
        );
    }

    const jobId = data.job_id;
    if (!jobId || typeof jobId !== 'string') {
        return NextResponse.json(
            { error: 'Saliency service did not return job_id.' },
            { status: 502 },
        );
    }

    return NextResponse.json({ jobId });
}
