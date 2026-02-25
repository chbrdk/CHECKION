/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/saliency/generate (async heatmap from scan)  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getScan, updateScanResult } from '@/lib/db/scans';
import { invalidateScan } from '@/lib/cache';
import { enrichPageIndexWithSaliency } from '@/lib/page-index';
import { getScreenshotBase64 } from '@/lib/screenshot-storage';

/** Base URL of the saliency service. Normalized to http: internal services in Docker/Coolify typically do not use TLS. */
function getSaliencyBaseUrl(): string | undefined {
    const raw = process.env.SALIENCY_SERVICE_URL;
    if (!raw?.trim()) return undefined;
    const url = raw.replace(/\/$/, '').trim();
    if (url.toLowerCase().startsWith('https://')) return url.replace(/^https:\/\//i, 'http://');
    return url;
}

/** Timeout (ms) for saliency request. Model on CPU can take 1–3 min for large screenshots. */
const SALIENCY_REQUEST_TIMEOUT_MS = 180_000;

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saliencyBaseUrl = getSaliencyBaseUrl();
    if (!saliencyBaseUrl) {
        return NextResponse.json(
            { error: 'Saliency service not configured (SALIENCY_SERVICE_URL).' },
            { status: 503 },
        );
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

    const predictUrl = saliencyBaseUrl + '/predict';
    let res: Response;
    try {
        res = await fetch(predictUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: imageBase64 }),
            signal: AbortSignal.timeout(SALIENCY_REQUEST_TIMEOUT_MS),
        });
    } catch (e) {
        const isTimeout =
            (e instanceof Error && e.name === 'AbortError') ||
            (e instanceof Error && /timeout|aborted/i.test(e.message));
        const message = isTimeout
            ? `Saliency-Anfrage Zeitüberschreitung (${SALIENCY_REQUEST_TIMEOUT_MS / 1000}s). Service auf CPU kann länger brauchen. SALIENCY_SERVICE_URL prüfen, gleiches Netz wie Saliency-Container.`
            : (e instanceof Error ? e.message : 'Saliency service request failed') +
              ' (SALIENCY_SERVICE_URL prüfen, gleiches Netz wie Saliency-Container.)';
        const detail = e instanceof Error ? String(e) : message;
        console.error('[CHECKION] saliency/generate: fetch error', { url: predictUrl, error: detail });
        return NextResponse.json({ error: message }, { status: 502 });
    }

    if (!res.ok) {
        const text = await res.text();
        console.error('[CHECKION] saliency/generate: service returned', res.status, text);
        return NextResponse.json(
            { error: `Saliency service error: ${res.status}` },
            { status: res.status >= 500 ? 502 : 502 },
        );
    }

    let data: { heatmap_base64?: string };
    try {
        data = (await res.json()) as { heatmap_base64?: string };
    } catch {
        return NextResponse.json(
            { error: 'Invalid response from saliency service.' },
            { status: 502 },
        );
    }

    const heatmapBase64 = data.heatmap_base64;
    if (!heatmapBase64 || typeof heatmapBase64 !== 'string') {
        return NextResponse.json(
            { error: 'Saliency service did not return heatmap_base64.' },
            { status: 502 },
        );
    }

    const dataUrl = `data:image/png;base64,${heatmapBase64}`;

    let pageIndexPatch: { pageIndex?: typeof result.pageIndex } = {};
    if (result.pageIndex) {
        try {
            pageIndexPatch.pageIndex = await enrichPageIndexWithSaliency(result.pageIndex, dataUrl);
        } catch (e) {
            console.error('[CHECKION] saliency/generate: enrichPageIndexWithSaliency failed', e);
            // continue without enriched pageIndex
        }
    }

    const updated = await updateScanResult(scanId, session.user.id, {
        saliencyHeatmap: dataUrl,
        ...pageIndexPatch,
    });
    if (!updated) {
        return NextResponse.json(
            { error: 'Failed to save heatmap to scan.' },
            { status: 500 },
        );
    }
    invalidateScan(scanId);

    return NextResponse.json({ success: true });
}
