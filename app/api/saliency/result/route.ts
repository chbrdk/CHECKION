/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/saliency/result?jobId=xxx&scanId=yyy (poll job status)  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { auth } from '@/auth';
import { getScan, updateScanResult } from '@/lib/db/scans';
import { invalidateScan } from '@/lib/cache';
import { fuseSaliencyHeatmap } from '@/lib/saliency-fusion';
import { enrichPageIndexWithSaliency } from '@/lib/page-index';
import { getVisionRegions } from '@/lib/saliency-vision-cache';

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

const RESULT_FETCH_TIMEOUT_MS = 10_000;
const STRUCTURE_WEIGHT = parseFloat(process.env.SALIENCY_FUSION_STRUCTURE_WEIGHT ?? '0.45');
const VISION_WEIGHT = parseFloat(process.env.SALIENCY_FUSION_VISION_WEIGHT ?? '0.2');

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const scanId = searchParams.get('scanId');
    if (!jobId || !scanId) {
        return NextResponse.json(
            { error: 'Missing jobId or scanId.' },
            { status: 400 },
        );
    }

    const result = await getScan(scanId, session.user.id);
    if (!result) {
        return NextResponse.json({ error: 'Scan not found.' }, { status: 404 });
    }

    const saliencyBaseUrl = getSaliencyBaseUrl();
    if (!saliencyBaseUrl) {
        return NextResponse.json(
            { error: 'Saliency service not configured.' },
            { status: 503 },
        );
    }

    const jobUrl = `${saliencyBaseUrl}/jobs/${jobId}`;
    let res: Response;
    try {
        res = await fetch(jobUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(RESULT_FETCH_TIMEOUT_MS),
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch job status';
        console.error('[CHECKION] saliency/result: fetch error', { jobId, error: message });
        return NextResponse.json(
            { error: message, status: 'error' as const },
            { status: 502 },
        );
    }

    if (res.status === 404) {
        return NextResponse.json(
            { status: 'not_found' as const, error: 'Job not found or expired.' },
            { status: 404 },
        );
    }

    if (!res.ok) {
        const text = await res.text();
        console.error('[CHECKION] saliency/result: service returned', res.status, text);
        return NextResponse.json(
            { error: `Saliency service error: ${res.status}`, status: 'error' as const },
            { status: 502 },
        );
    }

    let job: { status: string; heatmap_base64?: string; error?: string };
    try {
        job = (await res.json()) as { status: string; heatmap_base64?: string; error?: string };
    } catch {
        return NextResponse.json(
            { error: 'Invalid response from saliency service.', status: 'error' as const },
            { status: 502 },
        );
    }

    if (job.status === 'pending' || job.status === 'running') {
        return NextResponse.json({ status: job.status as 'pending' | 'running' });
    }

    if (job.status === 'failed') {
        return NextResponse.json({
            status: 'failed' as const,
            error: job.error ?? 'Saliency job failed.',
        });
    }

    if (job.status === 'completed' && job.heatmap_base64) {
        let heatmapBase64 = job.heatmap_base64;
        const buf = Buffer.from(heatmapBase64, 'base64');
        const meta = await sharp(buf).metadata();
        const width = meta.width ?? 1920;
        const height = meta.height ?? 1080;

        try {
            heatmapBase64 = await fuseSaliencyHeatmap({
                sumHeatmapPngBase64: heatmapBase64,
                pageIndex: result.pageIndex,
                structureWeight: STRUCTURE_WEIGHT,
                visionRegions: getVisionRegions(jobId),
                visionWeight: VISION_WEIGHT,
                width,
                height,
            });
        } catch (e) {
            console.error('[CHECKION] saliency/result: fusion failed', e);
        }

        const dataUrl = `data:image/png;base64,${heatmapBase64}`;
        let pageIndexPatch: { pageIndex?: typeof result.pageIndex } = {};
        if (result.pageIndex) {
            try {
                pageIndexPatch.pageIndex = await enrichPageIndexWithSaliency(result.pageIndex, dataUrl);
            } catch (e) {
                console.error('[CHECKION] saliency/result: enrichPageIndexWithSaliency failed', e);
            }
        }
        const updated = await updateScanResult(scanId, session.user.id, {
            saliencyHeatmap: dataUrl,
            ...pageIndexPatch,
        });
        if (!updated) {
            return NextResponse.json(
                { status: 'completed' as const, heatmapDataUrl: dataUrl, error: 'Failed to save heatmap to scan.' },
                { status: 500 },
            );
        }
        invalidateScan(scanId);
        return NextResponse.json({
            status: 'completed' as const,
            success: true,
            heatmapDataUrl: dataUrl,
        });
    }

    return NextResponse.json(
        { status: 'error' as const, error: 'Invalid job state.' },
        { status: 502 },
    );
}
